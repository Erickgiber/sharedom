export interface CaptureSettings {
  showModal: boolean;
  autoCopy: boolean;
  crossOriginImages: boolean;
}

export const DEFAULT_CAPTURE_SETTINGS: CaptureSettings = {
  showModal: true,
  autoCopy: true,
  crossOriginImages: true,
};

const CAPTURE_SETTINGS_KEY = 'captureSettings';
const IMAGE_ACCESS_PROMPTED_KEY = 'imageAccessPrompted';

export async function loadCaptureSettings(): Promise<CaptureSettings> {
  try {
    const stored = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
    const saved = stored[CAPTURE_SETTINGS_KEY] as Partial<CaptureSettings> | undefined;
    return { ...DEFAULT_CAPTURE_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_CAPTURE_SETTINGS };
  }
}

export async function saveCaptureSettings(settings: CaptureSettings): Promise<void> {
  await chrome.storage.local.set({ [CAPTURE_SETTINGS_KEY]: settings });
}

export function shouldCopyAfterCapture(settings: CaptureSettings): boolean {
  return settings.autoCopy || !settings.showModal;
}

export async function wasImageAccessPrompted(): Promise<boolean> {
  try {
    const stored = await chrome.storage.local.get(IMAGE_ACCESS_PROMPTED_KEY);
    return stored[IMAGE_ACCESS_PROMPTED_KEY] === true;
  } catch {
    return true;
  }
}

export async function markImageAccessPrompted(): Promise<void> {
  try {
    await chrome.storage.local.set({ [IMAGE_ACCESS_PROMPTED_KEY]: true });
  } catch {}
}
