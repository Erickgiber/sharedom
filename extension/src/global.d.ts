/// <reference types="chrome" />

import type { ExtensionLanguage } from './shared/i18n';

export interface InspectorOptions {
  scale?: number;
  format?: 'png' | 'jpeg' | 'webp';
  language?: ExtensionLanguage;
}

export interface StartInspectorMessage {
  type: 'START_INSPECTOR';
  options?: InspectorOptions;
}

export interface CaptureConsoleMessage {
  type: 'CAPTURE_CONSOLE_LOGS';
  options?: InspectorOptions;
}

export interface CaptureNetworkMessage {
  type: 'CAPTURE_NETWORK_REQUESTS';
  options?: InspectorOptions;
}

export interface StartAreaCaptureMessage {
  type: 'START_AREA_CAPTURE';
  options?: InspectorOptions;
}

export interface StopInspectorMessage {
  type: 'STOP_INSPECTOR';
}

export interface ToggleInspectorMessage {
  type: 'TOGGLE_INSPECTOR';
  options?: InspectorOptions;
}

export interface GetInspectorStatusMessage {
  type: 'GET_INSPECTOR_STATUS';
}

/** Sent by the content script so the extension can fetch images the page itself cannot read. */
export interface FetchImageMessage {
  type: 'SHAREDOM_FETCH_IMAGE';
  url: string;
}

/** Sent by the content script to read the tab pixels for the exact-to-screen capture mode. */
export interface CaptureVisibleTabMessage {
  type: 'SHAREDOM_CAPTURE_VISIBLE_TAB';
}

export type CaptureVisibleTabResponse = { dataUrl: string } | { error: string };

export type ExtensionMessage =
  | StartInspectorMessage
  | CaptureConsoleMessage
  | CaptureNetworkMessage
  | StartAreaCaptureMessage
  | StopInspectorMessage
  | ToggleInspectorMessage
  | GetInspectorStatusMessage
  | FetchImageMessage
  | CaptureVisibleTabMessage;

declare global {
  interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }

  interface Window {
    /** File System Access API: not part of the DOM lib shipped with TypeScript yet. */
    showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  }

  /** Breakout Box (WebCodecs media streams), still missing from the TypeScript DOM lib. */
  class MediaStreamTrackProcessor<T = VideoFrame> {
    constructor(init: { track: MediaStreamTrack; maxBufferSize?: number });
    readonly readable: ReadableStream<T>;
  }

  class MediaStreamTrackGenerator extends MediaStreamTrack {
    constructor(init: { kind: 'video' | 'audio' });
    readonly writable: WritableStream<VideoFrame>;
  }
}
