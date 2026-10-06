export type RecordingStatus = 'idle' | 'starting' | 'recording' | 'saving' | 'error';
export type RecordingQuality = 'standard' | 'high' | 'ultra';
export type RecordingContainer = 'mp4' | 'webm';
/** 0 means "as fast as the source and the machine can deliver". */
export type RecordingFrameRate = 30 | 60 | 120 | 0;

export interface RecordingSettings {
  frameRate: RecordingFrameRate;
  quality: RecordingQuality;
  container: RecordingContainer;
  microphone: boolean;
}

export interface RecordingState {
  status: RecordingStatus;
  startedAt: number;
  bytes: number;
  settings: RecordingSettings;
  /** Translation key inside the recorder section, resolved by whichever UI shows it. */
  messageKey?: string;
}

export const DEFAULT_RECORDING_SETTINGS: RecordingSettings = {
  frameRate: 60,
  quality: 'high',
  // WebM is the default because Chrome's MP4 muxer cannot stream: see containerStreams().
  container: 'webm',
  microphone: false,
};

/**
 * Chrome's MP4 muxer writes the whole file when the recording stops: no chunk is delivered while
 * it runs, so the size cannot be measured live and the browser holds the video in memory until
 * then. WebM delivers chunks continuously and is written straight to disk.
 */
export function containerStreams(container: RecordingContainer): boolean {
  return container === 'webm';
}

const MP4_CANDIDATES = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1.4d002a,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
];

const WEBM_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

/** Highest quality variant the browser actually supports for the chosen container. */
export function resolveMimeType(container: RecordingContainer): string | null {
  const candidates = container === 'mp4' ? MP4_CANDIDATES : WEBM_CANDIDATES;
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function supportedContainers(): RecordingContainer[] {
  return (['mp4', 'webm'] as const).filter((container) => resolveMimeType(container) !== null);
}

export function recordingFileName(container: RecordingContainer): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `sharedom-recording-${stamp}.${container}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
