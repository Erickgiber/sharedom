import { ExtensionLanguage, normalizeLanguage, translations } from '../shared/i18n';

const titleEl = document.getElementById('txt-title') as HTMLElement;
const bodyEl = document.getElementById('txt-body') as HTMLElement;
const allowBtn = document.getElementById('allow-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLElement;

const CLOSE_DELAY_MS = 1600;
const RECORDING_START_TIMEOUT_MS = 120_000;
const shouldStartRecording = new URLSearchParams(window.location.search).has('autostart');

let language: ExtensionLanguage = 'en';

function text() {
  return translations[language].recorder;
}

function setStatus(message: string, kind: 'info' | 'success' | 'error' = 'info'): void {
  statusEl.textContent = message;
  statusEl.className = kind === 'success' ? 'status is-success' : kind === 'error' ? 'status is-error' : 'status';
}

async function isMicrophoneBlocked(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state === 'denied';
  } catch {
    return false;
  }
}

/**
 * An extension popup cannot host Chrome's microphone prompt, which is why it is requested from
 * this page: a normal tab can show it, and the grant then belongs to the extension origin.
 */
async function requestMicrophone(): Promise<void> {
  allowBtn.disabled = true;
  setStatus('');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!shouldStartRecording) stream.getTracks().forEach((track) => track.stop());
  } catch {
    setStatus(text().micPageDenied, 'error');
    allowBtn.disabled = false;
    return;
  }

  if (!shouldStartRecording) {
    setStatus(text().micPageGranted, 'success');
    setTimeout(() => window.close(), CLOSE_DELAY_MS);
    return;
  }

  setStatus(text().micPageStarting, 'success');
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'RECORDER_STATUS' && message.status !== 'starting') window.close();
  });
  setTimeout(() => window.close(), RECORDING_START_TIMEOUT_MS);
  try {
    await chrome.runtime.sendMessage({ type: 'MICROPHONE_GRANTED' });
  } catch {
    window.close();
  }
}

allowBtn.addEventListener('click', () => void requestMicrophone());

async function init(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get('language');
    language = normalizeLanguage(stored.language);
  } catch {
    language = 'en';
  }

  const t = text();
  document.documentElement.lang = language;
  document.title = `ShareDOM - ${t.micPageTitle}`;
  titleEl.textContent = t.micPageTitle;
  bodyEl.textContent = t.micPageBody;
  allowBtn.textContent = t.micPageButton;

  if (await isMicrophoneBlocked()) {
    setStatus(t.micPageDenied, 'error');
    return;
  }
  await requestMicrophone();
}

void init();
