import type { CountryCode } from '../../../../preview/src/i18n/flags';

export type ExtensionLanguage = 'en' | 'es' | 'zh' | 'ja' | 'pt' | 'de' | 'ko' | 'ru';

export interface LanguageOption {
  code: ExtensionLanguage;
  abbr: string;
  label: string;
  country: CountryCode;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: 'en', abbr: 'EN', label: 'English', country: 'gb' },
  { code: 'es', abbr: 'ES', label: 'Español', country: 'es' },
  { code: 'zh', abbr: 'ZH', label: '中文', country: 'cn' },
  { code: 'ja', abbr: 'JA', label: '日本語', country: 'jp' },
  { code: 'pt', abbr: 'PT', label: 'Português', country: 'pt' },
  { code: 'de', abbr: 'DE', label: 'Deutsch', country: 'de' },
  { code: 'ko', abbr: 'KO', label: '한국어', country: 'kr' },
  { code: 'ru', abbr: 'RU', label: 'Русский', country: 'ru' },
];

export interface PopupTranslations {
  ctaTitle: string;
  ctaSubtitle: string;
  btnConsoleLogs: string;
  btnConsoleLogsSubtitle: string;
  btnNetworkRequests: string;
  btnNetworkRequestsSubtitle: string;
  btnArea: string;
  btnAreaSubtitle: string;
  btnRecord: string;
  btnRecordSubtitle: string;
  defaultSettings: string;
  resolution: string;
  format: string;
  resStandard: string;
  resRetina: string;
  resUltra: string;
  fmtPng: string;
  fmtJpeg: string;
  fmtWebp: string;
  fmtPdf: string;
  shortcutsTitle: string;
  shortcutInspect: string;
  shortcutRecord: string;
  shortcutArea: string;
  shortcutParentChild: string;
  shortcutCapture: string;
  shortcutCancel: string;
  shortcutsSettings: string;
  buyCoffee: string;
  footer: string;
  switchLanguage: string;
  restrictedPageTitle: string;
  restrictedPageDesc: string;
  permissionErrorTitle: string;
  permissionErrorDesc: string;
  btnRetry: string;
  btnReloadTab: string;
  earlyCaptureTitle: string;
  earlyCaptureDesc: string;
  earlyCaptureEnabled: string;
  earlyCaptureDenied: string;
  earlyCaptureError: string;
  earlyCaptureLegend: string;
  earlyCaptureIconTooltip: string;
  imageAccessTitle: string;
  imageAccessDesc: string;
  imageAccessEnabled: string;
  imageAccessDenied: string;
}

export interface OverlayTranslations {
  title: string;
  prompt: string;
  parent: string;
  capture: string;
  exit: string;
  areaPrompt: string;
}

export interface ModalTranslations {
  title: string;
  consoleTitle: string;
  networkTitle: string;
  logsSubtitle: string;
  networkSubtitle: string;
  rendering: string;
  resolution: string;
  format: string;
  background: string;
  bgAuto: string;
  bgTransparent: string;
  bgWhite: string;
  bgDark: string;
  bgCustom: string;
  reselect: string;
  reselectTooltip: string;
  base64: string;
  download: string;
  copyImage: string;
  pdf: string;
  pdfTooltip: string;
  generatingPdf: string;
  pdfSuccess: string;
  pdfError: string;
  copySuccess: string;
  copyError: string;
  dataUrlSuccess: string;
  dataUrlError: string;
  downloaded: string;
  captureFailed: string;
  loadingDom: string;
  loadingLogs: string;
  loadingNetwork: string;
  page: string;
  prevPage: string;
  nextPage: string;
  allCopied: string;
  allDownloaded: string;
  zipDownloaded: string;
  copyLogs: string;
  copyLogsTooltip: string;
  logsCopied: string;
  logsCopyError: string;
  copyNetwork: string;
  copyNetworkTooltip: string;
  networkCopied: string;
  networkCopyError: string;
  noLogsToCopy: string;
  noRequestsToCopy: string;
  areaTitle: string;
  areaCopied: string;
  engineFallback: string;
  share: string;
  shareError: string;
  edit: string;
  editDone: string;
  editCancel: string;
  editUndo: string;
  editClear: string;
}

export interface RecorderTranslations {
  title: string;
  subtitle: string;
  sourceHint: string;
  back: string;
  frameRate: string;
  fpsUnlimited: string;
  quality: string;
  qualityStandard: string;
  qualityHigh: string;
  qualityUltra: string;
  format: string;
  microphone: string;
  watermarkNote: string;
  bufferNote: string;
  mp4Note: string;
  micDenied: string;
  micPageTitle: string;
  micPageBody: string;
  micPageButton: string;
  micPageGranted: string;
  micPageDenied: string;
  micOpenedTab: string;
  micUnavailable: string;
  micMuted: string;
  micPageStarting: string;
  start: string;
  stop: string;
  elapsed: string;
  size: string;
  statusReady: string;
  statusRequesting: string;
  statusRecording: string;
  statusSaving: string;
  statusSaved: string;
  statusCanceled: string;
  statusDenied: string;
  statusUnsupported: string;
  statusError: string;
  statusEmpty: string;
  statusMemoryLimit: string;
}

export interface WhatsNewTranslations {
  title: string;
  items: string[];
}

export interface ExtensionTranslations {
  popup: PopupTranslations;
  overlay: OverlayTranslations;
  modal: ModalTranslations;
  recorder: RecorderTranslations;
  whatsNew: WhatsNewTranslations;
}
