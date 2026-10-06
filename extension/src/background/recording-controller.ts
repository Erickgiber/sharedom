import {
  DEFAULT_RECORDING_SETTINGS,
  RecordingSettings,
  RecordingState,
  RecordingStatus,
} from '../shared/recording';

const OFFSCREEN_URL = 'offscreen.html';
const MICROPHONE_PAGE = 'microphone.html';
const MICROPHONE_AUTOSTART_PAGE = `${MICROPHONE_PAGE}?autostart=1`;

let state: RecordingState = {
  status: 'idle',
  startedAt: 0,
  bytes: 0,
  settings: DEFAULT_RECORDING_SETTINGS,
};

const listeners = new Set<(state: RecordingState) => void>();

export function getRecordingState(): RecordingState {
  return { ...state };
}

interface OffscreenQueryResponse {
  isRecording: boolean;
  bytes: number;
  startedAt: number;
}

/**
 * The service worker is suspended when nothing happens for a while, which wipes its copy of the
 * state while the offscreen document keeps recording. The document is asked on every wake up.
 */
export async function restoreStateFromOffscreen(): Promise<void> {
  if (state.status !== 'idle') return;

  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    });
    if (contexts.length === 0) return;

    const response = (await chrome.runtime.sendMessage({ type: 'RECORDER_QUERY' })) as
      | OffscreenQueryResponse
      | undefined;

    if (response?.isRecording) {
      setState({
        status: 'recording',
        startedAt: response.startedAt,
        bytes: response.bytes,
        messageKey: undefined,
      });
    }
  } catch {
    // No offscreen document listening.
  }
}

export function onRecordingStateChange(listener: (state: RecordingState) => void): void {
  listeners.add(listener);
}

function setState(patch: Partial<RecordingState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener(getRecordingState());
}

/**
 * The recording lives in an offscreen document so it survives the popup closing, which happens as
 * soon as Chrome's sharing picker takes focus.
 */
async function ensureOffscreenDocument(): Promise<void> {
  const existing = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  if (existing.length > 0) return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: [
      chrome.offscreen.Reason.DISPLAY_MEDIA,
      chrome.offscreen.Reason.USER_MEDIA,
      chrome.offscreen.Reason.BLOBS,
    ],
    justification: 'Records the screen the user picked and buffers it until it is saved.',
  });
}

async function closeOffscreenDocument(): Promise<void> {
  try {
    await chrome.offscreen.closeDocument();
  } catch {
    // Already closed.
  }
}

async function openMicrophonePage(): Promise<void> {
  const url = chrome.runtime.getURL(MICROPHONE_AUTOSTART_PAGE);
  try {
    const tabs = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.TAB] });
    const existing = tabs.find((context) => context.documentUrl?.includes(MICROPHONE_PAGE));
    if (existing && existing.tabId >= 0) {
      await chrome.tabs.update(existing.tabId, { url, active: true });
      return;
    }
  } catch {}
  await chrome.tabs.create({ url });
}

export async function startRecording(settings: RecordingSettings, isMicrophoneChecked = false): Promise<void> {
  if (state.status !== 'idle' && state.status !== 'error') return;

  setState({ status: 'starting', bytes: 0, startedAt: 0, settings, messageKey: undefined });

  try {
    await ensureOffscreenDocument();
    await chrome.runtime.sendMessage({ type: 'RECORDER_START', settings, isMicrophoneChecked });
  } catch {
    await closeOffscreenDocument();
    setState({ status: 'error', messageKey: 'statusError' });
  }
}

/**
 * Frames drive the chunk cadence, but a still screen produces none. While someone is watching the
 * popup the numbers must still move, so each state read asks for a flush.
 */
export function flushRecording(): void {
  if (state.status !== 'recording') return;
  void chrome.runtime.sendMessage({ type: 'RECORDER_FLUSH' }).catch(() => undefined);
}

export async function stopRecording(): Promise<void> {
  if (state.status !== 'recording') return;
  setState({ status: 'saving' });

  try {
    await chrome.runtime.sendMessage({ type: 'RECORDER_STOP' });
  } catch {
    setState({ status: 'error', messageKey: 'statusError' });
  }
}

export async function toggleRecording(settings?: RecordingSettings): Promise<void> {
  if (state.status === 'recording') {
    await stopRecording();
    return;
  }
  if (state.status === 'idle' || state.status === 'error') {
    await startRecording(settings ?? state.settings);
  }
}

export async function loadStoredSettings(): Promise<RecordingSettings> {
  try {
    const stored = await chrome.storage.local.get('recordingSettings');
    const saved = stored.recordingSettings as Partial<RecordingSettings> | undefined;
    return saved ? { ...DEFAULT_RECORDING_SETTINGS, ...saved } : DEFAULT_RECORDING_SETTINGS;
  } catch {
    return DEFAULT_RECORDING_SETTINGS;
  }
}

interface OffscreenStatusMessage {
  type: 'RECORDER_STATUS';
  status: RecordingStatus;
  startedAt?: number;
  bytes?: number;
  messageKey?: string;
}

interface OffscreenProgressMessage {
  type: 'RECORDER_PROGRESS';
  bytes: number;
}

interface OffscreenSaveMessage {
  type: 'RECORDER_SAVE';
  url: string;
  fileName: string;
  bytes: number;
}

interface OffscreenMicrophonePermissionMessage {
  type: 'RECORDER_MIC_PERMISSION';
}

export type OffscreenMessage =
  | OffscreenStatusMessage
  | OffscreenProgressMessage
  | OffscreenSaveMessage
  | OffscreenMicrophonePermissionMessage;

async function saveRecording(message: OffscreenSaveMessage): Promise<void> {
  try {
    // saveAs is left to Chrome so the browser's own "ask where to save" preference decides.
    await chrome.downloads.download({
      url: message.url,
      filename: message.fileName,
    });
    setState({ status: 'idle', bytes: message.bytes, messageKey: 'statusSaved' });
  } catch {
    setState({ status: 'idle', messageKey: 'statusCanceled' });
  } finally {
    URL.revokeObjectURL(message.url);
    try {
      await chrome.runtime.sendMessage({ type: 'RECORDER_CLEANUP' });
    } catch {
      // The offscreen document is already gone.
    }
    await closeOffscreenDocument();
  }
}

/** Returns true when the message belonged to the recording pipeline. */
export function handleOffscreenMessage(message: OffscreenMessage): boolean {
  if (message.type === 'RECORDER_STATUS') {
    setState({
      status: message.status,
      startedAt: message.startedAt ?? state.startedAt,
      bytes: message.bytes ?? state.bytes,
      messageKey: message.messageKey,
    });

    if (message.status === 'error') {
      void closeOffscreenDocument();
    }
    return true;
  }

  if (message.type === 'RECORDER_MIC_PERMISSION') {
    setState({ status: 'idle', messageKey: 'micOpenedTab' });
    void openMicrophonePage();
    return true;
  }

  if (message.type === 'RECORDER_PROGRESS') {
    setState({ bytes: message.bytes });
    return true;
  }

  if (message.type === 'RECORDER_SAVE') {
    void saveRecording(message);
    return true;
  }

  return false;
}
