import {
  ExtensionLanguage,
  LANGUAGE_OPTIONS,
  getLanguageOption,
  normalizeLanguage,
  translations,
} from '../shared/i18n';
import { FLAGS } from '../../../preview/src/i18n/flags';
import {
  DEFAULT_RECORDING_SETTINGS,
  RecordingContainer,
  RecordingFrameRate,
  RecordingQuality,
  RecordingSettings,
  RecordingState,
  containerStreams,
  formatBytes,
  formatDuration,
  supportedContainers,
} from '../shared/recording';
import {
  disableEarlyCapture,
  disableImageAccess,
  enableEarlyCapture,
  enableImageAccess,
  isEarlyCaptureEnabled,
  isImageAccessEnabled,
  originPatternFromUrl,
} from '../shared/early-capture';

const inspectBtn = document.getElementById('inspect-btn') as HTMLButtonElement;
const captureConsoleBtn = document.getElementById('capture-console-btn') as HTMLButtonElement;
const captureNetworkBtn = document.getElementById('capture-network-btn') as HTMLButtonElement;
const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
const btnRecordTitle = document.getElementById('btn-record-title') as HTMLElement;
const btnRecordSubtitle = document.getElementById('btn-record-subtitle') as HTMLElement;
const shortcutsSettingsBtn = document.getElementById('shortcuts-settings-btn') as HTMLButtonElement;

// What's new
const whatsNewCard = document.getElementById('whats-new') as HTMLElement;
const whatsNewVersion = document.getElementById('whats-new-version') as HTMLElement;
const whatsNewTitle = document.getElementById('whats-new-title') as HTMLElement;
const whatsNewList = document.getElementById('whats-new-list') as HTMLElement;
const whatsNewClose = document.getElementById('whats-new-close') as HTMLButtonElement;

// Recorder view
const mainView = document.getElementById('main-view') as HTMLElement;
const recorderView = document.getElementById('recorder-view') as HTMLElement;
const recorderBackBtn = document.getElementById('recorder-back-btn') as HTMLButtonElement;
const recIndicator = document.getElementById('rec-indicator') as HTMLElement;
const recStats = document.getElementById('rec-stats') as HTMLElement;
const recElapsed = document.getElementById('rec-elapsed') as HTMLElement;
const recSize = document.getElementById('rec-size') as HTMLElement;
const recStatus = document.getElementById('rec-status') as HTMLElement;
const recSettings = document.getElementById('rec-settings') as HTMLElement;
const recFpsSelect = document.getElementById('rec-fps-select') as HTMLSelectElement;
const recQualitySelect = document.getElementById('rec-quality-select') as HTMLSelectElement;
const recFormatSelect = document.getElementById('rec-format-select') as HTMLSelectElement;
const recMicToggle = document.getElementById('rec-mic-toggle') as HTMLInputElement;
const recStartBtn = document.getElementById('rec-start-btn') as HTMLButtonElement;
const recStopBtn = document.getElementById('rec-stop-btn') as HTMLButtonElement;
const txtRecTitle = document.getElementById('txt-rec-title') as HTMLElement;
const txtRecSubtitle = document.getElementById('txt-rec-subtitle') as HTMLElement;
const txtRecSourceHint = document.getElementById('txt-rec-source-hint') as HTMLElement;
const txtRecFrameRate = document.getElementById('txt-rec-framerate') as HTMLElement;
const txtRecQuality = document.getElementById('txt-rec-quality') as HTMLElement;
const txtRecFormat = document.getElementById('txt-rec-format') as HTMLElement;
const txtRecMicrophone = document.getElementById('txt-rec-microphone') as HTMLElement;
const txtRecWatermark = document.getElementById('txt-rec-watermark') as HTMLElement;
const txtRecMp4Note = document.getElementById('txt-rec-mp4-note') as HTMLElement;
const txtRecBuffer = document.getElementById('txt-rec-buffer') as HTMLElement;
const txtRecElapsed = document.getElementById('txt-rec-elapsed') as HTMLElement;
const txtRecSize = document.getElementById('txt-rec-size') as HTMLElement;
const txtRecStart = document.getElementById('txt-rec-start') as HTMLElement;
const txtRecStop = document.getElementById('txt-rec-stop') as HTMLElement;
const btnConsoleTitle = document.getElementById('btn-console-title') as HTMLElement;
const btnConsoleSubtitle = document.getElementById('btn-console-subtitle') as HTMLElement;
const btnNetworkTitle = document.getElementById('btn-network-title') as HTMLElement;
const btnNetworkSubtitle = document.getElementById('btn-network-subtitle') as HTMLElement;

const scaleSelect = document.getElementById('scale-select') as HTMLSelectElement;
const formatSelect = document.getElementById('format-select') as HTMLSelectElement;
const langSelect = document.getElementById('lang-select') as HTMLElement;
const langSelectTrigger = document.getElementById('lang-select-trigger') as HTMLButtonElement;
const langSelectMenu = document.getElementById('lang-select-menu') as HTMLElement;
const langFlag = document.getElementById('lang-flag') as HTMLElement;
const langAbbr = document.getElementById('lang-abbr') as HTMLElement;
const versionBadge = document.getElementById('version-badge') as HTMLElement;
const osModifiers = document.querySelectorAll<HTMLElement>('.os-modifier');

const ctaTitle = document.getElementById('cta-title') as HTMLElement;
const ctaSubtitle = document.getElementById('cta-subtitle') as HTMLElement;
const txtDefaultSettings = document.getElementById('txt-default-settings') as HTMLElement;
const txtResolutionLabel = document.getElementById('txt-resolution-label') as HTMLElement;
const txtFormatLabel = document.getElementById('txt-format-label') as HTMLElement;
const txtShortcutsTitle = document.getElementById('txt-shortcuts-title') as HTMLElement;
const txtShortcutInspect = document.getElementById('txt-shortcut-inspect') as HTMLElement;
const txtShortcutRecord = document.getElementById('txt-shortcut-record') as HTMLElement;
const txtShortcutParentChild = document.getElementById('txt-shortcut-parent-child') as HTMLElement;
const txtShortcutCapture = document.getElementById('txt-shortcut-capture') as HTMLElement;
const txtShortcutCancel = document.getElementById('txt-shortcut-cancel') as HTMLElement;
const txtCoffee = document.getElementById('txt-coffee') as HTMLElement;
const txtFooter = document.getElementById('txt-footer') as HTMLElement;

// Status & Permission Banner elements
const statusBanner = document.getElementById('status-banner') as HTMLElement;
const bannerIconShield = document.getElementById('banner-icon-shield') as HTMLElement;
const bannerIconAlert = document.getElementById('banner-icon-alert') as HTMLElement;
const bannerTitle = document.getElementById('banner-title') as HTMLElement;
const bannerDesc = document.getElementById('banner-desc') as HTMLElement;
const bannerActions = document.getElementById('banner-actions') as HTMLElement;
const bannerRetryBtn = document.getElementById('banner-retry-btn') as HTMLButtonElement;
const bannerReloadBtn = document.getElementById('banner-reload-btn') as HTMLButtonElement;

// Early capture (per-site opt-in) elements
const earlyCaptureSection = document.getElementById('early-capture-section') as HTMLElement;
const earlyCaptureToggle = document.getElementById('early-capture-toggle') as HTMLInputElement;
const earlyCaptureHost = document.getElementById('early-capture-host') as HTMLElement;
const earlyCaptureHint = document.getElementById('early-capture-hint') as HTMLElement;
const txtEarlyTitle = document.getElementById('txt-early-title') as HTMLElement;
const txtEarlyDesc = document.getElementById('txt-early-desc') as HTMLElement;
const txtEarlyLegend = document.getElementById('txt-early-legend') as HTMLElement;
const imageAccessToggle = document.getElementById('image-access-toggle') as HTMLInputElement;
const imageAccessHint = document.getElementById('image-access-hint') as HTMLElement;
const txtImageAccessTitle = document.getElementById('txt-image-access-title') as HTMLElement;
const txtImageAccessDesc = document.getElementById('txt-image-access-desc') as HTMLElement;

const isMac = navigator.platform.toUpperCase().includes('MAC') || navigator.userAgent.includes('Macintosh');
for (const modifier of osModifiers) {
  modifier.textContent = isMac ? '⌥ Option' : 'Alt';
}

let currentLanguage: ExtensionLanguage = 'en';
let currentTab: chrome.tabs.Tab | null = null;
let isRestrictedPage = false;
let hasPermissionError = false;
let earlyCapturePattern: string | null = null;

function isUrlRestricted(url?: string): boolean {
  if (!url) return true;
  const restrictedPrefixes = [
    'chrome://',
    'edge://',
    'about:',
    'chrome-extension://',
    'devtools://',
    'view-source:',
  ];
  if (restrictedPrefixes.some((prefix) => url.startsWith(prefix))) {
    return true;
  }
  if (
    url.startsWith('https://chromewebstore.google.com') ||
    url.startsWith('https://chrome.google.com/webstore') ||
    url.startsWith('https://microsoftedge.microsoft.com/addons')
  ) {
    return true;
  }
  return false;
}

function updateBannerUI(): void {
  const t = translations[currentLanguage].popup;

  if (isRestrictedPage) {
    if (statusBanner) {
      statusBanner.style.display = 'flex';
      statusBanner.className = 'status-banner banner-warning';
    }
    if (bannerIconShield) bannerIconShield.style.display = 'block';
    if (bannerIconAlert) bannerIconAlert.style.display = 'none';
    if (bannerTitle) bannerTitle.textContent = t.restrictedPageTitle;
    if (bannerDesc) bannerDesc.textContent = t.restrictedPageDesc;
    if (bannerActions) bannerActions.style.display = 'none';
    if (inspectBtn) inspectBtn.disabled = true;
    if (captureConsoleBtn) captureConsoleBtn.disabled = true;
    if (captureNetworkBtn) captureNetworkBtn.disabled = true;
  } else if (hasPermissionError) {
    if (statusBanner) {
      statusBanner.style.display = 'flex';
      statusBanner.className = 'status-banner banner-error';
    }
    if (bannerIconShield) bannerIconShield.style.display = 'none';
    if (bannerIconAlert) bannerIconAlert.style.display = 'block';
    if (bannerTitle) bannerTitle.textContent = t.permissionErrorTitle;
    if (bannerDesc) bannerDesc.textContent = t.permissionErrorDesc;
    if (bannerActions) bannerActions.style.display = 'flex';
    if (bannerRetryBtn) bannerRetryBtn.textContent = t.btnRetry;
    if (bannerReloadBtn) bannerReloadBtn.textContent = t.btnReloadTab;
    if (inspectBtn) inspectBtn.disabled = false;
    if (captureConsoleBtn) captureConsoleBtn.disabled = false;
    if (captureNetworkBtn) captureNetworkBtn.disabled = false;
  } else {
    if (statusBanner) statusBanner.style.display = 'none';
    if (inspectBtn) inspectBtn.disabled = false;
    if (captureConsoleBtn) captureConsoleBtn.disabled = false;
    if (captureNetworkBtn) captureNetworkBtn.disabled = false;
  }
}

function applyLanguage(lang: ExtensionLanguage): void {
  currentLanguage = lang;
  const t = translations[lang].popup;

  syncLanguageSelect(lang);

  if (ctaTitle) ctaTitle.textContent = t.ctaTitle;
  if (ctaSubtitle) ctaSubtitle.textContent = t.ctaSubtitle;
  if (btnConsoleTitle) btnConsoleTitle.textContent = t.btnConsoleLogs;
  if (btnConsoleSubtitle) btnConsoleSubtitle.textContent = t.btnConsoleLogsSubtitle;
  if (btnNetworkTitle) btnNetworkTitle.textContent = t.btnNetworkRequests;
  if (btnNetworkSubtitle) btnNetworkSubtitle.textContent = t.btnNetworkRequestsSubtitle;
  if (btnRecordTitle) btnRecordTitle.textContent = t.btnRecord;
  if (btnRecordSubtitle) btnRecordSubtitle.textContent = t.btnRecordSubtitle;
  if (shortcutsSettingsBtn) shortcutsSettingsBtn.textContent = t.shortcutsSettings;
  applyRecorderLanguage(lang);
  renderWhatsNew(lang);
  if (langSelectTrigger) langSelectTrigger.title = t.switchLanguage;
  if (langSelectMenu) langSelectMenu.setAttribute('aria-label', t.switchLanguage);

  if (txtEarlyTitle) txtEarlyTitle.textContent = t.earlyCaptureTitle;
  if (txtEarlyDesc) txtEarlyDesc.textContent = t.earlyCaptureDesc;
  if (txtEarlyLegend) txtEarlyLegend.textContent = t.earlyCaptureLegend;
  if (txtImageAccessTitle) txtImageAccessTitle.textContent = t.imageAccessTitle;
  if (txtImageAccessDesc) txtImageAccessDesc.textContent = t.imageAccessDesc;
  if (txtDefaultSettings) txtDefaultSettings.textContent = t.defaultSettings;
  if (txtResolutionLabel) txtResolutionLabel.textContent = t.resolution;
  if (txtFormatLabel) txtFormatLabel.textContent = t.format;
  if (txtShortcutsTitle) txtShortcutsTitle.textContent = t.shortcutsTitle;
  if (txtShortcutInspect) txtShortcutInspect.textContent = t.shortcutInspect;
  if (txtShortcutRecord) txtShortcutRecord.textContent = t.shortcutRecord;
  if (txtShortcutParentChild) txtShortcutParentChild.textContent = t.shortcutParentChild;
  if (txtShortcutCapture) txtShortcutCapture.textContent = t.shortcutCapture;
  if (txtShortcutCancel) txtShortcutCancel.textContent = t.shortcutCancel;
  if (txtCoffee) txtCoffee.textContent = t.buyCoffee;
  if (txtFooter) txtFooter.textContent = t.footer;

  if (scaleSelect) {
    const opts = scaleSelect.options;
    if (opts.length >= 3) {
      opts[0].textContent = t.resStandard;
      opts[1].textContent = t.resRetina;
      opts[2].textContent = t.resUltra;
    }
  }

  if (formatSelect) {
    const opts = formatSelect.options;
    if (opts.length >= 4) {
      opts[0].textContent = t.fmtPng;
      opts[1].textContent = t.fmtJpeg;
      opts[2].textContent = t.fmtWebp;
      opts[3].textContent = t.fmtPdf;
    }
  }

  updateBannerUI();
}

function initFastSettings(): void {
  try {
    versionBadge.textContent = `v${chrome.runtime.getManifest().version}`;
    const cachedLang = localStorage.getItem('sharedom_lang');
    if (cachedLang && cachedLang in translations) {
      applyLanguage(normalizeLanguage(cachedLang));
    }
    const cachedScale = localStorage.getItem('sharedom_scale');
    if (cachedScale && scaleSelect) {
      scaleSelect.value = cachedScale;
    }
    const cachedFormat = localStorage.getItem('sharedom_format');
    if (cachedFormat && formatSelect) {
      formatSelect.value = cachedFormat;
    }
  } catch {}
}

async function loadSettings(): Promise<void> {
  try {
    const data = await chrome.storage.local.get(['language', 'defaultScale', 'defaultFormat']);
    if (typeof data.language === 'string' && data.language in translations) {
      const stored = normalizeLanguage(data.language);
      applyLanguage(stored);
      try { localStorage.setItem('sharedom_lang', stored); } catch {}
    } else if (!localStorage.getItem('sharedom_lang')) {
      applyLanguage('en');
    }

    if (data.defaultScale && scaleSelect) {
      scaleSelect.value = String(data.defaultScale);
      try { localStorage.setItem('sharedom_scale', String(data.defaultScale)); } catch {}
    }
    if (data.defaultFormat && formatSelect) {
      formatSelect.value = String(data.defaultFormat);
      try { localStorage.setItem('sharedom_format', String(data.defaultFormat)); } catch {}
    }
  } catch {
    applyLanguage('en');
  }
}

async function saveSettings(): Promise<void> {
  try {
    localStorage.setItem('sharedom_lang', currentLanguage);
    if (scaleSelect) localStorage.setItem('sharedom_scale', scaleSelect.value);
    if (formatSelect) localStorage.setItem('sharedom_format', formatSelect.value);
  } catch {}
  try {
    await chrome.storage.local.set({
      language: currentLanguage,
      defaultScale: Number(scaleSelect.value),
      defaultFormat: formatSelect.value,
    });
  } catch {}
}

async function checkActiveTab(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab || null;
    isRestrictedPage = isUrlRestricted(tab?.url);
    updateBannerUI();
    await refreshEarlyCaptureUI();
  } catch {
    isRestrictedPage = true;
    updateBannerUI();
    await refreshEarlyCaptureUI();
  }
}

async function ensureInjected(tabId: number): Promise<void> {
  try {
    const status = await chrome.tabs.sendMessage(tabId, { type: 'GET_INSPECTOR_STATUS' });
    if (status && typeof status === 'object') return;
  } catch {}

  // Inject page-tracker in MAIN world for console/network hooking
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['page-tracker.js'],
      world: 'MAIN',
    });
  } catch {}

  // Inject content.js in isolated world
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js'],
  });
}

async function triggerTabAction(actionType: 'START_INSPECTOR' | 'CAPTURE_CONSOLE_LOGS' | 'CAPTURE_NETWORK_REQUESTS'): Promise<void> {
  hasPermissionError = false;
  updateBannerUI();

  if (!currentTab?.id || isRestrictedPage) {
    return;
  }

  const inspectorOptions = {
    scale: Number(scaleSelect.value),
    format: formatSelect.value as 'png' | 'jpeg' | 'webp',
    language: currentLanguage,
  };

  try {
    await ensureInjected(currentTab.id);
    await chrome.tabs.sendMessage(currentTab.id, {
      type: actionType,
      options: inspectorOptions,
    });
    window.close();
  } catch (err) {
    console.error('Failed to trigger action on tab:', err);
    hasPermissionError = true;
    updateBannerUI();
  }
}

function showEarlyCaptureHint(message: string, isError = false): void {
  if (!earlyCaptureHint) return;
  earlyCaptureHint.textContent = message;
  earlyCaptureHint.className = isError ? 'early-capture-hint hint-error' : 'early-capture-hint';
  earlyCaptureHint.style.display = message ? 'block' : 'none';
}

async function refreshEarlyCaptureUI(): Promise<void> {
  earlyCapturePattern = isRestrictedPage ? null : originPatternFromUrl(currentTab?.url);

  if (!earlyCaptureSection) return;
  if (!earlyCapturePattern) {
    earlyCaptureSection.style.display = 'none';
    return;
  }

  earlyCaptureSection.style.display = 'flex';
  if (earlyCaptureHost) {
    earlyCaptureHost.textContent = earlyCapturePattern.replace(/^https?:\/\//, '').replace(/\/\*$/, '');
  }
  showEarlyCaptureHint('');
  if (earlyCaptureToggle) {
    earlyCaptureToggle.checked = await isEarlyCaptureEnabled(earlyCapturePattern);
  }
  if (imageAccessToggle) {
    imageAccessToggle.checked = await isImageAccessEnabled();
  }
}

function showImageAccessHint(message: string, isError = false): void {
  if (!imageAccessHint) return;
  imageAccessHint.textContent = message;
  imageAccessHint.className = isError ? 'early-capture-hint hint-error' : 'early-capture-hint';
  imageAccessHint.style.display = message ? 'block' : 'none';
}

imageAccessToggle?.addEventListener('change', async () => {
  const shouldEnable = imageAccessToggle.checked;
  const t = translations[currentLanguage].popup;
  imageAccessToggle.disabled = true;

  try {
    if (shouldEnable) {
      const granted = await enableImageAccess();
      imageAccessToggle.checked = granted;
      showImageAccessHint(granted ? t.imageAccessEnabled : t.imageAccessDenied, !granted);
    } else {
      await disableImageAccess();
      showImageAccessHint('');
    }
  } catch {
    imageAccessToggle.checked = !shouldEnable;
    showImageAccessHint(t.earlyCaptureError, true);
  } finally {
    imageAccessToggle.disabled = false;
  }
});

earlyCaptureToggle?.addEventListener('change', async () => {
  const pattern = earlyCapturePattern;
  if (!pattern) return;

  const shouldEnable = earlyCaptureToggle.checked;
  const t = translations[currentLanguage].popup;
  earlyCaptureToggle.disabled = true;

  try {
    if (shouldEnable) {
      const granted = await enableEarlyCapture(pattern);
      earlyCaptureToggle.checked = granted;
      showEarlyCaptureHint(granted ? t.earlyCaptureEnabled : t.earlyCaptureDenied, !granted);
    } else {
      await disableEarlyCapture(pattern);
      showEarlyCaptureHint('');
    }
  } catch {
    earlyCaptureToggle.checked = !shouldEnable;
    showEarlyCaptureHint(t.earlyCaptureError, true);
  } finally {
    earlyCaptureToggle.disabled = false;
  }
});

function buildLanguageMenu(): void {
  if (!langSelectMenu) return;

  for (const option of LANGUAGE_OPTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lang-option';
    button.dataset.lang = option.code;
    button.setAttribute('role', 'menuitemradio');
    button.innerHTML = `
      <span class="lang-flag">${FLAGS[option.country]}</span>
      <span class="lang-abbr">${option.abbr}</span>
      <span class="lang-name">${option.label}</span>
    `;
    button.addEventListener('click', async () => {
      closeLanguageMenu();
      if (option.code === currentLanguage) return;
      applyLanguage(option.code);
      await saveSettings();
    });
    langSelectMenu.appendChild(button);
  }
}

function syncLanguageSelect(lang: ExtensionLanguage): void {
  const active = getLanguageOption(lang);
  if (langFlag) langFlag.innerHTML = FLAGS[active.country];
  if (langAbbr) langAbbr.textContent = active.abbr;

  langSelectMenu?.querySelectorAll<HTMLButtonElement>('.lang-option').forEach((option) => {
    const isActive = option.dataset.lang === lang;
    option.classList.toggle('active', isActive);
    option.setAttribute('aria-checked', String(isActive));
  });
}

function closeLanguageMenu(): void {
  langSelect?.classList.remove('open');
  langSelectTrigger?.setAttribute('aria-expanded', 'false');
}

langSelectTrigger?.addEventListener('click', (event) => {
  event.stopPropagation();
  const isOpen = langSelect.classList.toggle('open');
  langSelectTrigger.setAttribute('aria-expanded', String(isOpen));
});

document.addEventListener('click', (event) => {
  if (!langSelect?.contains(event.target as Node)) closeLanguageMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeLanguageMenu();
});

recordBtn?.addEventListener('click', showRecorderView);

shortcutsSettingsBtn?.addEventListener('click', async () => {
  await chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  window.close();
});

scaleSelect?.addEventListener('change', saveSettings);
formatSelect?.addEventListener('change', saveSettings);

inspectBtn?.addEventListener('click', () => triggerTabAction('START_INSPECTOR'));
captureConsoleBtn?.addEventListener('click', () => triggerTabAction('CAPTURE_CONSOLE_LOGS'));
captureNetworkBtn?.addEventListener('click', () => triggerTabAction('CAPTURE_NETWORK_REQUESTS'));
bannerRetryBtn?.addEventListener('click', () => triggerTabAction('START_INSPECTOR'));

bannerReloadBtn?.addEventListener('click', async () => {
  if (currentTab?.id) {
    try {
      await chrome.tabs.reload(currentTab.id);
      window.close();
    } catch {}
  }
});


// ---- What's new (shown once per installed version) ----

const LAST_SEEN_VERSION_KEY = 'lastSeenVersion';
let isWhatsNewVisible = false;

function renderWhatsNew(lang: ExtensionLanguage): void {
  if (!whatsNewCard || !isWhatsNewVisible) return;

  const notes = translations[lang].whatsNew;
  whatsNewTitle.textContent = notes.title;
  whatsNewList.innerHTML = '';

  for (const item of notes.items) {
    const entry = document.createElement('li');
    entry.textContent = item;
    whatsNewList.appendChild(entry);
  }
}

async function initWhatsNew(): Promise<void> {
  const version = chrome.runtime.getManifest().version;

  try {
    const stored = await chrome.storage.local.get(LAST_SEEN_VERSION_KEY);
    if (stored[LAST_SEEN_VERSION_KEY] === version) return;
    // Marked as seen as soon as it is shown, so it never comes back for this version.
    await chrome.storage.local.set({ [LAST_SEEN_VERSION_KEY]: version });
  } catch {
    return;
  }

  isWhatsNewVisible = true;
  whatsNewVersion.textContent = `v${version}`;
  whatsNewCard.hidden = false;
  renderWhatsNew(currentLanguage);
}

whatsNewClose?.addEventListener('click', () => {
  whatsNewCard.hidden = true;
  isWhatsNewVisible = false;
});

// ---- Screen recorder view ----

const RECORDING_SETTINGS_KEY = 'recordingSettings';
const STATE_POLL_MS = 500;

let recordingSettings: RecordingSettings = { ...DEFAULT_RECORDING_SETTINGS };
let recordingState: RecordingState | null = null;
let statePollId: number | null = null;

function applyRecorderLanguage(lang: ExtensionLanguage): void {
  const t = translations[lang].recorder;

  if (txtRecTitle) txtRecTitle.textContent = t.title;
  if (txtRecSubtitle) txtRecSubtitle.textContent = t.subtitle;
  if (txtRecSourceHint) txtRecSourceHint.textContent = t.sourceHint;
  if (txtRecFrameRate) txtRecFrameRate.textContent = t.frameRate;
  if (txtRecQuality) txtRecQuality.textContent = t.quality;
  if (txtRecFormat) txtRecFormat.textContent = t.format;
  if (txtRecMicrophone) txtRecMicrophone.textContent = t.microphone;
  if (txtRecWatermark) txtRecWatermark.textContent = t.watermarkNote;
  if (txtRecMp4Note) txtRecMp4Note.textContent = t.mp4Note;
  if (txtRecBuffer) txtRecBuffer.textContent = t.bufferNote;
  if (txtRecElapsed) txtRecElapsed.textContent = t.elapsed;
  if (txtRecSize) txtRecSize.textContent = t.size;
  if (txtRecStart) txtRecStart.textContent = t.start;
  if (txtRecStop) txtRecStop.textContent = t.stop;
  if (recorderBackBtn) recorderBackBtn.setAttribute('aria-label', t.back);

  if (recFpsSelect && recFpsSelect.options.length === 4) {
    recFpsSelect.options[3].textContent = t.fpsUnlimited;
  }
  if (recQualitySelect && recQualitySelect.options.length === 3) {
    recQualitySelect.options[0].textContent = t.qualityStandard;
    recQualitySelect.options[1].textContent = t.qualityHigh;
    recQualitySelect.options[2].textContent = t.qualityUltra;
  }

  renderRecordingState();
}

function buildFormatOptions(): void {
  if (!recFormatSelect) return;

  const containers = supportedContainers();
  recFormatSelect.innerHTML = '';

  for (const container of containers) {
    const option = document.createElement('option');
    option.value = container;
    option.textContent = container === 'mp4' ? 'MP4 (H.264)' : 'WebM (VP9)';
    recFormatSelect.appendChild(option);
  }

  if (containers.length === 0) {
    recStartBtn.disabled = true;
  } else if (!containers.includes(recordingSettings.container)) {
    recordingSettings = { ...recordingSettings, container: containers[0] };
  }
}

function refreshContainerNote(): void {
  if (!txtRecMp4Note) return;
  txtRecMp4Note.hidden = containerStreams(recFormatSelect.value as RecordingContainer);
}

function readSettingsFromForm(): RecordingSettings {
  return {
    frameRate: Number(recFpsSelect.value) as RecordingFrameRate,
    quality: recQualitySelect.value as RecordingQuality,
    container: recFormatSelect.value as RecordingContainer,
    microphone: recMicToggle.checked,
  };
}

function writeSettingsToForm(settings: RecordingSettings): void {
  recFpsSelect.value = String(settings.frameRate);
  recQualitySelect.value = settings.quality;
  if ([...recFormatSelect.options].some((option) => option.value === settings.container)) {
    recFormatSelect.value = settings.container;
  }
  recMicToggle.checked = settings.microphone;
}

async function persistRecordingSettings(): Promise<void> {
  recordingSettings = readSettingsFromForm();
  refreshContainerNote();
  try {
    await chrome.storage.local.set({ [RECORDING_SETTINGS_KEY]: recordingSettings });
  } catch {}
}

function setRecorderStatus(message: string, kind: 'info' | 'error' | 'success' = 'info'): void {
  if (!recStatus) return;
  recStatus.textContent = message;
  recStatus.className =
    kind === 'error' ? 'rec-status is-error' : kind === 'success' ? 'rec-status is-success' : 'rec-status';
}

function renderRecordingState(): void {
  if (!recorderView || !recordingState) return;

  const t = translations[currentLanguage].recorder;
  const { status, startedAt, bytes, messageKey } = recordingState;
  const isBusy = status === 'recording' || status === 'starting' || status === 'saving';

  recIndicator.hidden = status !== 'recording';
  recStats.hidden = !isBusy;
  recSettings.hidden = isBusy;
  recStartBtn.hidden = isBusy;
  recStopBtn.hidden = status !== 'recording';
  recFpsSelect.disabled = isBusy;
  recQualitySelect.disabled = isBusy;
  recFormatSelect.disabled = isBusy;
  recMicToggle.disabled = isBusy;

  if (isBusy) {
    recElapsed.textContent = startedAt > 0 ? formatDuration(Date.now() - startedAt) : '00:00';
    // A buffered container reports nothing until it stops: an invented number would be worse.
    recSize.textContent = containerStreams(recordingState.settings.container)
      ? formatBytes(bytes)
      : '—';
  }

  const messageFromKey = messageKey ? (t[messageKey as keyof typeof t] ?? '') : '';

  if (status === 'recording') {
    setRecorderStatus(messageFromKey ? `${t.statusRecording} · ${messageFromKey}` : t.statusRecording);
  } else if (status === 'starting') {
    setRecorderStatus(t.statusRequesting);
  } else if (status === 'saving') {
    setRecorderStatus(t.statusSaving);
  } else if (status === 'error') {
    setRecorderStatus(messageFromKey || t.statusError, 'error');
  } else if (messageKey === 'statusSaved') {
    setRecorderStatus(`${t.statusSaved} · ${formatBytes(bytes)}`, 'success');
  } else if (messageFromKey) {
    setRecorderStatus(messageFromKey);
  } else {
    setRecorderStatus(t.statusReady);
  }
}

async function refreshRecordingState(): Promise<void> {
  try {
    const state = (await chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' })) as
      | RecordingState
      | undefined;
    if (state) {
      recordingState = state;
      renderRecordingState();
    }
  } catch {}
}

function startStatePolling(): void {
  if (statePollId !== null) return;
  statePollId = window.setInterval(() => {
    if (recordingState && recordingState.status === 'recording') {
      recElapsed.textContent = formatDuration(Date.now() - recordingState.startedAt);
    }
    void refreshRecordingState();
  }, STATE_POLL_MS);
}

function stopStatePolling(): void {
  if (statePollId === null) return;
  window.clearInterval(statePollId);
  statePollId = null;
}

function showRecorderView(): void {
  mainView.hidden = true;
  recorderView.hidden = false;
  void refreshRecordingState();
  startStatePolling();
}

function showMainView(): void {
  recorderView.hidden = true;
  mainView.hidden = false;
  stopStatePolling();
}

recorderBackBtn?.addEventListener('click', showMainView);

recStartBtn?.addEventListener('click', async () => {
  await persistRecordingSettings();
  recStartBtn.disabled = true;
  setRecorderStatus(translations[currentLanguage].recorder.statusRequesting);

  try {
    // The desktop picker takes focus and closes this popup; the recording lives in the
    // service worker from here on and the view resumes when the popup is opened again.
    await chrome.runtime.sendMessage({ type: 'START_RECORDING', settings: recordingSettings });
  } catch {
    setRecorderStatus(translations[currentLanguage].recorder.statusError, 'error');
  } finally {
    recStartBtn.disabled = false;
  }
});

recStopBtn?.addEventListener('click', async () => {
  recStopBtn.disabled = true;
  try {
    await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  } catch {
  } finally {
    recStopBtn.disabled = false;
    await refreshRecordingState();
  }
});

for (const control of [recFpsSelect, recQualitySelect, recFormatSelect]) {
  control?.addEventListener('change', () => void persistRecordingSettings());
}

const MICROPHONE_PAGE = 'microphone.html';

async function microphonePermissionState(): Promise<PermissionState | null> {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state;
  } catch {
    return null;
  }
}

/**
 * Chrome refuses to show the microphone prompt inside an extension popup: it is denied on the
 * spot, with no dialog. A normal extension tab can show it, and the grant then belongs to the
 * extension origin, so the offscreen document that records inherits it.
 */
recMicToggle?.addEventListener('change', async () => {
  await persistRecordingSettings();
  if (!recMicToggle.checked) {
    setRecorderStatus(translations[currentLanguage].recorder.statusReady);
    return;
  }

  const state = await microphonePermissionState();
  if (state === 'granted') {
    setRecorderStatus(translations[currentLanguage].recorder.statusReady);
    return;
  }

  setRecorderStatus(translations[currentLanguage].recorder.micOpenedTab);
  await chrome.tabs.create({ url: chrome.runtime.getURL(MICROPHONE_PAGE) });
  window.close();
});

async function initRecorder(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(RECORDING_SETTINGS_KEY);
    const saved = stored[RECORDING_SETTINGS_KEY] as Partial<RecordingSettings> | undefined;
    if (saved) recordingSettings = { ...DEFAULT_RECORDING_SETTINGS, ...saved };
  } catch {}

  buildFormatOptions();
  writeSettingsToForm(recordingSettings);
  refreshContainerNote();
  applyRecorderLanguage(currentLanguage);

  await refreshRecordingState();
  if (recordingState && recordingState.status !== 'idle') {
    showRecorderView();
    return;
  }

  if (recordingSettings.microphone && (await microphonePermissionState()) === 'denied') {
    setRecorderStatus(translations[currentLanguage].recorder.micDenied, 'error');
  }
}

buildLanguageMenu();
initFastSettings();
Promise.all([loadSettings(), checkActiveTab(), initRecorder(), initWhatsNew()]);
