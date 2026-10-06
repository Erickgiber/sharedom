import {
  ENABLED_ORIGINS_STORAGE_KEY,
  hasHostPermission,
  isEarlyCaptureEnabled,
  originPatternFromUrl,
  syncEarlyCaptureScripts,
} from '../shared/early-capture';
import { ExtensionLanguage, normalizeLanguage, translations } from '../shared/i18n';
import { RecordingSettings } from '../shared/recording';
import type { CaptureVisibleTabResponse } from '../global';
import {
  OffscreenMessage,
  flushRecording,
  getRecordingState,
  handleOffscreenMessage,
  loadStoredSettings,
  onRecordingStateChange,
  restoreStateFromOffscreen,
  startRecording,
  stopRecording,
  toggleRecording,
} from './recording-controller';

const DEFAULT_ICON = {
  16: 'icons/icon-16.png',
  32: 'icons/icon-32.png',
  48: 'icons/icon-48.png',
  128: 'icons/icon-128.png',
};

const WATCHING_ICON = {
  16: 'icons/icon-watching-16.png',
  32: 'icons/icon-watching-32.png',
  48: 'icons/icon-watching-48.png',
  128: 'icons/icon-watching-128.png',
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sharedom-inspect',
    title: 'Inspect & Capture DOM Element',
    contexts: ['page', 'selection', 'image', 'link', 'editable'],
  });
  chrome.contextMenus.create({
    id: 'sharedom-capture-area',
    title: 'Capture Screen Area',
    contexts: ['page', 'selection', 'image', 'link', 'editable'],
  });
  void refreshEarlyCapture();
});

/** Host permissions can be revoked from chrome://extensions, so the registration is re-synced. */
async function refreshEarlyCapture(): Promise<void> {
  try {
    await syncEarlyCaptureScripts();
  } catch {}
  await refreshAllActionIcons();
}

async function currentLanguage(): Promise<ExtensionLanguage> {
  try {
    const stored = await chrome.storage.local.get('language');
    return normalizeLanguage(stored.language);
  } catch {
    return 'en';
  }
}

/**
 * Marks with a green dot the tabs whose origin opted into early capture.
 * `tab.url` is only readable for those origins, which is exactly the set we need.
 */
async function refreshActionIcon(tabId: number, url?: string): Promise<void> {
  const pattern = originPatternFromUrl(url);
  const isWatching = pattern ? await isEarlyCaptureEnabled(pattern) : false;
  const name = chrome.runtime.getManifest().name;

  try {
    // Also clears the error badge: a service worker restart can outlive its removal timer.
    await chrome.action.setBadgeText({ tabId, text: '' });
    await chrome.action.setIcon({ tabId, path: isWatching ? WATCHING_ICON : DEFAULT_ICON });
    const title = isWatching
      ? `${name} — ${translations[await currentLanguage()].popup.earlyCaptureIconTooltip}`
      : name;
    await chrome.action.setTitle({ tabId, title });
  } catch {}
}

async function refreshAllActionIcons(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs.map((tab) => (tab.id === undefined ? Promise.resolve() : refreshActionIcon(tab.id, tab.url)))
    );
  } catch {}
}

chrome.runtime.onStartup.addListener(() => void refreshEarlyCapture());
chrome.permissions.onAdded.addListener(() => void refreshEarlyCapture());
chrome.permissions.onRemoved.addListener(() => void refreshEarlyCapture());

// The popup writes the enabled origins; the registration must follow even if it closes right after.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && ENABLED_ORIGINS_STORAGE_KEY in changes) {
    void refreshEarlyCapture();
  }
});

// Tab specific action settings are reset by Chrome on every navigation.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url && changeInfo.status !== 'loading') return;
  void refreshActionIcon(tabId, changeInfo.url || tab.url);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await refreshActionIcon(tabId, tab.url);
  } catch {}
});

const RESTRICTED_PREFIXES = [
  'chrome://',
  'edge://',
  'about:',
  'chrome-extension://',
  'devtools://',
  'view-source:',
  'https://chromewebstore.google.com',
  'https://chrome.google.com/webstore',
  'https://microsoftedge.microsoft.com/addons',
];

/**
 * Without the `tabs` permission Chrome hides `tab.url` until activeTab is granted, so an unknown
 * URL must not block the action: only a URL we can positively read as restricted does.
 */
function isKnownRestrictedUrl(url?: string): boolean {
  return typeof url === 'string' && RESTRICTED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

const ERROR_BADGE_MS = 4000;

async function flagActionError(tabId: number, message: string): Promise<void> {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#dc2626' });
    await chrome.action.setBadgeText({ tabId, text: '!' });
    await chrome.action.setTitle({ tabId, title: message });
    setTimeout(() => {
      void chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
      void refreshActionIcon(tabId);
    }, ERROR_BADGE_MS);
  } catch {}
}

async function injectInspector(tabId: number): Promise<void> {
  // The MAIN world tracker is best effort: the inspector itself must still load without it.
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['page-tracker.js'],
      world: 'MAIN',
    });
  } catch {}

  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
}

async function sendToActiveTab(type: string, typeAfterInjection = type): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || isKnownRestrictedUrl(tab.url)) return;

  const tabId = tab.id;
  try {
    await chrome.tabs.sendMessage(tabId, { type });
    return;
  } catch {
    // No content script in this tab yet.
  }

  try {
    await injectInspector(tabId);
    await chrome.tabs.sendMessage(tabId, { type: typeAfterInjection });
  } catch {
    const t = translations[await currentLanguage()].popup;
    await flagActionError(tabId, t.permissionErrorDesc);
  }
}

function toggleInspectorOnActiveTab(): Promise<void> {
  return sendToActiveTab('TOGGLE_INSPECTOR', 'START_INSPECTOR');
}

function captureAreaOnActiveTab(): Promise<void> {
  return sendToActiveTab('START_AREA_CAPTURE');
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-inspector') {
    void toggleInspectorOnActiveTab();
    return;
  }
  if (command === 'capture-area') {
    void captureAreaOnActiveTab();
    return;
  }
  if (command === 'toggle-recording') {
    void restoreStateFromOffscreen()
      .then(() => loadStoredSettings())
      .then((settings) => toggleRecording(settings));
  }
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'sharedom-inspect') {
    void toggleInspectorOnActiveTab();
  }
  if (info.menuItemId === 'sharedom-capture-area') {
    void captureAreaOnActiveTab();
  }
});

const RECORDING_BADGE_COLOR = '#dc2626';

// The recorder outlives the popup, so the toolbar icon is the only permanent indicator.
onRecordingStateChange((state) => {
  const isRecording = state.status === 'recording' || state.status === 'starting';
  void chrome.action.setBadgeBackgroundColor({ color: RECORDING_BADGE_COLOR }).catch(() => undefined);
  void chrome.action.setBadgeText({ text: isRecording ? 'REC' : '' }).catch(() => undefined);
});

/**
 * Images the page cannot read because of CORS are fetched here instead: the extension network
 * stack is used only for origins the user explicitly granted.
 */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  const origin = originPatternFromUrl(url);
  if (!origin || !(await hasHostPermission(origin))) return null;

  try {
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) return null;

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;

    const buffer = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return `data:${blob.type};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

/**
 * Works under activeTab, which the user grants by opening the inspector from the popup, the
 * shortcut or the context menu; no extra permission is involved.
 */
async function captureVisibleTab(tab: chrome.tabs.Tab | undefined): Promise<CaptureVisibleTabResponse> {
  if (!tab || tab.windowId === undefined) return { error: 'The capture was not requested from a tab.' };
  try {
    return { dataUrl: await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return;

  if (handleOffscreenMessage(message as OffscreenMessage)) {
    return undefined;
  }

  if (message.type === 'GET_RECORDING_STATE') {
    restoreStateFromOffscreen().then(() => {
      sendResponse(getRecordingState());
      flushRecording();
    });
    return true;
  }

  if (message.type === 'START_RECORDING') {
    startRecording(message.settings as RecordingSettings).then(
      () => sendResponse(getRecordingState()),
      () => sendResponse(getRecordingState())
    );
    return true;
  }

  if (message.type === 'STOP_RECORDING') {
    stopRecording().then(
      () => sendResponse(getRecordingState()),
      () => sendResponse(getRecordingState())
    );
    return true;
  }

  if (message.type === 'MICROPHONE_GRANTED') {
    void restoreStateFromOffscreen()
      .then(() => loadStoredSettings())
      .then((settings) => startRecording(settings, true));
    return undefined;
  }

  if (message.type === 'SHAREDOM_CAPTURE_VISIBLE_TAB') {
    captureVisibleTab(_sender.tab).then(sendResponse);
    return true;
  }

  if (message.type === 'SHAREDOM_FETCH_IMAGE' && typeof message.url === 'string') {
    fetchImageAsDataUrl(message.url).then(
      (dataUrl) => sendResponse({ dataUrl }),
      () => sendResponse({ dataUrl: null })
    );
    return true;
  }

  return undefined;
});
