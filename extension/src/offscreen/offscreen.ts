import {
  RecordingSettings,
  containerStreams,
  recordingFileName,
  resolveMimeType,
} from '../shared/recording';
import { drawWatermark } from '../shared/watermark';

interface StartMessage {
  type: 'RECORDER_START';
  settings: RecordingSettings;
  isMicrophoneChecked?: boolean;
}

interface StopMessage {
  type: 'RECORDER_STOP';
}

const BITS_PER_PIXEL = { standard: 0.07, high: 0.12, ultra: 0.2 } as const;
const MIN_BITRATE = 2_000_000;
const MAX_BITRATE = 120_000_000;
/**
 * A hidden document has its timers throttled, and that includes the MediaRecorder timeslice, so
 * chunks are requested from the frame pipeline instead: it is driven by the media stack.
 */
const CHUNK_INTERVAL_MS = 1000;
const AUDIO_CONTEXT_RESUME_TIMEOUT_MS = 1500;
const BUFFER_FILE = 'sharedom-recording.bin';
/** Ceiling for containers the browser keeps in memory until the recording stops. */
const BUFFERED_MEMORY_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;

let recorder: MediaRecorder | null = null;
let sourceStream: MediaStream | null = null;
let outputStream: MediaStream | null = null;
let microphoneStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let frameAbort: AbortController | null = null;
let writable: FileSystemWritableFileStream | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let recordedBytes = 0;
let watermarkLogo: ImageBitmap | null = null;
let lastChunkRequest = 0;
let recordingStartedAt = 0;
let bytesPerSecond = 0;
let isStreamingContainer = true;

function report(message: Record<string, unknown>): void {
  void chrome.runtime.sendMessage(message).catch(() => undefined);
}

async function loadWatermarkLogo(): Promise<ImageBitmap | null> {
  if (watermarkLogo) return watermarkLogo;
  try {
    const response = await fetch(chrome.runtime.getURL('icons/icon-128.png'));
    watermarkLogo = await createImageBitmap(await response.blob());
    return watermarkLogo;
  } catch {
    return null;
  }
}

function requestChunkIfDue(): void {
  const now = performance.now();
  if (now - lastChunkRequest < CHUNK_INTERVAL_MS) return;

  lastChunkRequest = now;
  if (recorder?.state !== 'recording') return;

  if (isStreamingContainer) {
    recorder.requestData();
    return;
  }

  // Nothing can be flushed from a buffered container, so its growth is bounded by the encoder rate.
  const elapsedSeconds = (Date.now() - recordingStartedAt) / 1000;
  if (bytesPerSecond * elapsedSeconds >= BUFFERED_MEMORY_LIMIT_BYTES) {
    report({ type: 'RECORDER_STATUS', status: 'recording', messageKey: 'statusMemoryLimit' });
    stop();
  }
}

function canComposite(): boolean {
  return typeof MediaStreamTrackProcessor === 'function' && typeof MediaStreamTrackGenerator === 'function';
}

/**
 * Burns the watermark into every frame the source produces, one output frame per input frame, so
 * an uncapped frame rate stays uncapped. Runs off the render pipeline, which an offscreen
 * document does not have.
 */
function withWatermark(track: MediaStreamTrack): MediaStreamTrack {
  const processor = new MediaStreamTrackProcessor({ track });
  const generator = new MediaStreamTrackGenerator({ kind: 'video' });
  const writer = generator.writable.getWriter();

  let canvas: OffscreenCanvas | null = null;
  let context: OffscreenCanvasRenderingContext2D | null = null;

  frameAbort = new AbortController();

  void processor.readable
    .pipeTo(
      new WritableStream<VideoFrame>({
        async write(frame) {
          const width = frame.displayWidth;
          const height = frame.displayHeight;

          if (!canvas || canvas.width !== width || canvas.height !== height) {
            canvas = new OffscreenCanvas(width, height);
            context = canvas.getContext('2d');
          }

          if (!context) {
            frame.close();
            return;
          }

          context.drawImage(frame, 0, 0, width, height);
          drawWatermark(context, width, height, watermarkLogo);

          const composited = new VideoFrame(canvas, {
            timestamp: frame.timestamp ?? 0,
            duration: frame.duration ?? undefined,
          });
          frame.close();

          try {
            await writer.write(composited);
          } catch {
            composited.close();
          }

          requestChunkIfDue();
        },
        close() {
          void writer.close().catch(() => undefined);
        },
        abort() {
          void writer.abort().catch(() => undefined);
        },
      }),
      { signal: frameAbort.signal }
    )
    .catch(() => undefined);

  return generator;
}

function targetBitrate(track: MediaStreamTrack, settings: RecordingSettings): number {
  const trackSettings = track.getSettings();
  const width = trackSettings.width ?? 1920;
  const height = trackSettings.height ?? 1080;
  const fps = trackSettings.frameRate ?? settings.frameRate ?? 60;
  const raw = width * height * (fps || 60) * BITS_PER_PIXEL[settings.quality];
  return Math.round(Math.min(MAX_BITRATE, Math.max(MIN_BITRATE, raw)));
}

async function openBuffer(): Promise<FileSystemWritableFileStream> {
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(BUFFER_FILE, { create: true });
  return handle.createWritable();
}

async function readBufferFile(): Promise<File> {
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(BUFFER_FILE);
  return handle.getFile();
}

async function removeBufferFile(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(BUFFER_FILE);
  } catch {
    // Nothing buffered yet.
  }
}

/**
 * Chrome shows its own sharing picker here: tab, window or entire screen, plus the audio
 * checkbox. An offscreen document may open it without a user gesture, which is what keeps the
 * whole flow inside the popup.
 */
async function buildStream(settings: RecordingSettings): Promise<MediaStream> {
  const video: MediaTrackConstraints =
    settings.frameRate > 0 ? { frameRate: { ideal: settings.frameRate, max: settings.frameRate } } : {};

  try {
    return await navigator.mediaDevices.getDisplayMedia({ video, audio: true });
  } catch (error) {
    // Sources without shareable audio reject the whole request on some platforms.
    if (error instanceof DOMException && error.name === 'NotAllowedError') throw error;
    return navigator.mediaDevices.getDisplayMedia({ video });
  }
}

async function microphonePermission(): Promise<PermissionState | null> {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state;
  } catch {
    return null;
  }
}

async function openMicrophone(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return null;
    }
  }
}

async function resumeAudioContext(context: AudioContext): Promise<boolean> {
  const isRunning = () => context.state === 'running';
  if (isRunning()) return true;

  const timeout = new Promise<void>((resolve) => setTimeout(resolve, AUDIO_CONTEXT_RESUME_TIMEOUT_MS));
  await Promise.race([context.resume().catch(() => undefined), timeout]);
  return isRunning();
}

function reportMicrophoneState(track: MediaStreamTrack): void {
  if (recorder?.state !== 'recording') return;
  report({
    type: 'RECORDER_STATUS',
    status: 'recording',
    messageKey: track.muted ? 'micMuted' : undefined,
  });
}

async function mixAudio(stream: MediaStream): Promise<{ tracks: MediaStreamTrack[]; messageKey?: string }> {
  const sourceAudio = stream.getAudioTracks();

  microphoneStream = await openMicrophone();
  const [microphoneTrack] = microphoneStream?.getAudioTracks() ?? [];
  if (!microphoneStream || !microphoneTrack) {
    return { tracks: sourceAudio, messageKey: 'micUnavailable' };
  }

  microphoneTrack.addEventListener('mute', () => reportMicrophoneState(microphoneTrack));
  microphoneTrack.addEventListener('unmute', () => reportMicrophoneState(microphoneTrack));
  const messageKey = microphoneTrack.muted ? 'micMuted' : undefined;

  if (sourceAudio.length === 0) return { tracks: [microphoneTrack], messageKey };

  const context = new AudioContext();
  if (!(await resumeAudioContext(context))) {
    void context.close().catch(() => undefined);
    return { tracks: [microphoneTrack], messageKey };
  }

  audioContext = context;
  const destination = context.createMediaStreamDestination();
  context.createMediaStreamSource(new MediaStream(sourceAudio)).connect(destination);
  context.createMediaStreamSource(microphoneStream).connect(destination);
  return { tracks: destination.stream.getAudioTracks(), messageKey };
}

function releaseStreams(): void {
  frameAbort?.abort();
  frameAbort = null;

  sourceStream?.getTracks().forEach((track) => track.stop());
  outputStream?.getTracks().forEach((track) => track.stop());
  microphoneStream?.getTracks().forEach((track) => track.stop());
  sourceStream = null;
  outputStream = null;
  microphoneStream = null;

  if (audioContext) {
    void audioContext.close().catch(() => undefined);
    audioContext = null;
  }

}

async function finalize(settings: RecordingSettings): Promise<void> {
  report({ type: 'RECORDER_STATUS', status: 'saving', bytes: recordedBytes });

  try {
    await writeQueue;
    await writable?.close();
  } catch {
    writable = null;
    report({ type: 'RECORDER_STATUS', status: 'error', messageKey: 'statusError' });
    await removeBufferFile();
    return;
  }

  writable = null;

  try {
    const file = await readBufferFile();
    if (file.size === 0) {
      await removeBufferFile();
      report({ type: 'RECORDER_STATUS', status: 'error', messageKey: 'statusEmpty' });
      return;
    }

    // A blob URL backed by the buffered file streams to the download without loading it in memory.
    const url = URL.createObjectURL(file);
    report({
      type: 'RECORDER_SAVE',
      url,
      fileName: recordingFileName(settings.container),
      bytes: file.size,
    });
  } catch {
    report({ type: 'RECORDER_STATUS', status: 'error', messageKey: 'statusError' });
    await removeBufferFile();
  }
}

async function start(message: StartMessage): Promise<void> {
  const { settings } = message;

  const mimeType = resolveMimeType(settings.container);
  if (!mimeType) {
    report({ type: 'RECORDER_STATUS', status: 'error', messageKey: 'statusUnsupported' });
    return;
  }

  if (settings.microphone && !message.isMicrophoneChecked) {
    const permission = await microphonePermission();
    if (permission === 'prompt' || permission === 'denied') {
      report({ type: 'RECORDER_MIC_PERMISSION' });
      return;
    }
  }

  await removeBufferFile();
  recordedBytes = 0;
  writeQueue = Promise.resolve();

  try {
    sourceStream = await buildStream(settings);
  } catch (error) {
    const canceled = error instanceof DOMException && error.name === 'NotAllowedError';
    report({
      type: 'RECORDER_STATUS',
      status: canceled ? 'idle' : 'error',
      messageKey: canceled ? 'statusCanceled' : 'statusDenied',
    });
    return;
  }

  const [videoTrack] = sourceStream.getVideoTracks();
  if (!videoTrack) {
    releaseStreams();
    report({ type: 'RECORDER_STATUS', status: 'error', messageKey: 'statusError' });
    return;
  }

  const mixed: { tracks: MediaStreamTrack[]; messageKey?: string } = settings.microphone
    ? await mixAudio(sourceStream)
    : { tracks: sourceStream.getAudioTracks() };
  const audioTracks = mixed.tracks;

  await loadWatermarkLogo();
  const isComposited = canComposite();
  const composited = isComposited ? withWatermark(videoTrack) : videoTrack;
  outputStream = new MediaStream([composited, ...audioTracks]);

  const bitrate = targetBitrate(videoTrack, settings);
  bytesPerSecond = bitrate / 8;
  isStreamingContainer = containerStreams(settings.container);

  try {
    writable = await openBuffer();
    recorder = new MediaRecorder(outputStream, { mimeType, videoBitsPerSecond: bitrate });
  } catch {
    releaseStreams();
    report({ type: 'RECORDER_STATUS', status: 'error', messageKey: 'statusError' });
    return;
  }

  // Progress is reported from the media pipeline, not from a timer: an offscreen document is
  // hidden and Chrome throttles its timers to about once per minute.
  recorder.ondataavailable = (event) => {
    if (event.data.size === 0) return;
    recordedBytes += event.data.size;
    report({ type: 'RECORDER_PROGRESS', bytes: recordedBytes });

    const target = writable;
    if (!target) return;
    writeQueue = writeQueue.then(() => target.write(event.data)).catch(() => undefined);
  };

  recorder.onerror = () => {
    report({ type: 'RECORDER_STATUS', status: 'error', messageKey: 'statusError' });
    stop();
  };

  recorder.onstop = () => {
    releaseStreams();
    void finalize(settings);
  };

  // Chrome's own "Stop sharing" bar ends the source track without touching the recorder.
  videoTrack.addEventListener('ended', stop);

  lastChunkRequest = performance.now();
  recordingStartedAt = Date.now();
  // Without the compositor there is no frame callback to drive requestData from.
  recorder.start(isComposited && isStreamingContainer ? undefined : CHUNK_INTERVAL_MS);
  report({
    type: 'RECORDER_STATUS',
    status: 'recording',
    startedAt: recordingStartedAt,
    bytes: 0,
    messageKey: mixed.messageKey,
  });
}

function stop(): void {
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
    return;
  }
  releaseStreams();
}

chrome.runtime.onMessage.addListener((message: StartMessage | StopMessage | { type: string }, _sender, sendResponse) => {
  // A suspended service worker loses its copy of the state; this is the source of truth.
  if (message.type === 'RECORDER_QUERY') {
    sendResponse({
      isRecording: recorder?.state === 'recording',
      bytes: recordedBytes,
      startedAt: recordingStartedAt,
    });
    return;
  }

  if (message.type === 'RECORDER_START') {
    void start(message as StartMessage);
    return;
  }
  if (message.type === 'RECORDER_STOP') {
    stop();
    return;
  }
  if (message.type === 'RECORDER_FLUSH') {
    if (isStreamingContainer && recorder?.state === 'recording') {
      lastChunkRequest = performance.now();
      recorder.requestData();
    }
    return;
  }
  if (message.type === 'RECORDER_CLEANUP') {
    void removeBufferFile();
  }
});

report({ type: 'RECORDER_READY' });
