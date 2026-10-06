import { ExtensionLanguage, normalizeLanguage, translations } from '../shared/i18n';

const titleEl = document.getElementById('txt-title') as HTMLElement;
const bodyEl = document.getElementById('txt-body') as HTMLElement;
const allowBtn = document.getElementById('allow-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLElement;

const CLOSE_DELAY_MS = 1600;

let language: ExtensionLanguage = 'en';

function text() {
  return translations[language].recorder;
}

function setStatus(message: string, kind: 'info' | 'success' | 'error' = 'info'): void {
  statusEl.textContent = message;
  statusEl.className = kind === 'success' ? 'status is-success' : kind === 'error' ? 'status is-error' : 'status';
}

/**
 * An extension popup cannot host Chrome's microphone prompt, which is why it is requested from
 * this page: a normal tab can show it, and the grant then belongs to the extension origin.
 */
allowBtn.addEventListener('click', async () => {
  allowBtn.disabled = true;
  setStatus('');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    setStatus(text().micPageGranted, 'success');
    setTimeout(() => window.close(), CLOSE_DELAY_MS);
  } catch {
    setStatus(text().micPageDenied, 'error');
    allowBtn.disabled = false;
  }
});

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
}

void init();
