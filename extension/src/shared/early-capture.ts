/**
 * Two independent opt-ins live here, both backed by optional host permissions:
 *
 * - Early capture: registers the MAIN world tracker at document_start for the origins the user
 *   enabled, so console output produced while the page loads is not lost.
 * - Cross origin images: lets the service worker fetch images the page itself cannot read because
 *   of CORS, which is what makes a capture match what the browser paints.
 *
 * The granted permissions are not the source of truth by themselves: a broad grant for images must
 * not silently turn early capture on everywhere, so the enabled origins are stored separately.
 */
const EARLY_SCRIPT_ID = 'sharedom-early-tracker';
const ENABLED_ORIGINS_KEY = 'earlyCaptureOrigins';
const WEB_ORIGIN_PREFIXES = ['http://', 'https://'];

export const ALL_URLS_PATTERN = '*://*/*';

export function originPatternFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch {
    return null;
  }
}

export async function hasHostPermission(pattern: string): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ origins: [pattern] });
  } catch {
    return false;
  }
}

async function readEnabledOrigins(): Promise<string[]> {
  try {
    const stored = await chrome.storage.local.get(ENABLED_ORIGINS_KEY);
    const origins: unknown = stored[ENABLED_ORIGINS_KEY];
    if (!Array.isArray(origins)) return [];
    return origins.filter(
      (origin): origin is string =>
        typeof origin === 'string' && WEB_ORIGIN_PREFIXES.some((prefix) => origin.startsWith(prefix))
    );
  } catch {
    return [];
  }
}

async function writeEnabledOrigins(origins: string[]): Promise<void> {
  await chrome.storage.local.set({ [ENABLED_ORIGINS_KEY]: origins });
}

export async function isEarlyCaptureEnabled(pattern: string): Promise<boolean> {
  const origins = await readEnabledOrigins();
  if (!origins.includes(pattern)) return false;
  return hasHostPermission(pattern);
}

/** Keeps the single registered content script in sync with the enabled and still granted origins. */
export async function syncEarlyCaptureScripts(): Promise<void> {
  const enabled = await readEnabledOrigins();
  const matches: string[] = [];
  for (const pattern of enabled) {
    if (await hasHostPermission(pattern)) matches.push(pattern);
  }

  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [EARLY_SCRIPT_ID] });

  if (matches.length === 0) {
    if (registered.length > 0) {
      await chrome.scripting.unregisterContentScripts({ ids: [EARLY_SCRIPT_ID] });
    }
    return;
  }

  const script: chrome.scripting.RegisteredContentScript = {
    id: EARLY_SCRIPT_ID,
    matches,
    js: ['page-tracker.js'],
    runAt: 'document_start',
    world: 'MAIN',
    allFrames: false,
    persistAcrossSessions: true,
  };

  // Popup and service worker can sync concurrently, so both directions must tolerate a stale read.
  if (registered.length > 0) {
    try {
      await chrome.scripting.updateContentScripts([script]);
    } catch {
      await chrome.scripting.registerContentScripts([script]);
    }
    return;
  }

  try {
    await chrome.scripting.registerContentScripts([script]);
  } catch {
    await chrome.scripting.updateContentScripts([script]);
  }
}

export const ENABLED_ORIGINS_STORAGE_KEY = ENABLED_ORIGINS_KEY;

/** Returns false when the user dismissed the permission prompt. */
export async function enableEarlyCapture(pattern: string): Promise<boolean> {
  const granted = await chrome.permissions.request({ origins: [pattern] });
  if (!granted) return false;

  const enabled = await readEnabledOrigins();
  if (!enabled.includes(pattern)) {
    await writeEnabledOrigins([...enabled, pattern]);
  }

  await syncEarlyCaptureScripts();
  return true;
}

export async function disableEarlyCapture(pattern: string): Promise<void> {
  const enabled = await readEnabledOrigins();
  await writeEnabledOrigins(enabled.filter((origin) => origin !== pattern));
  await syncEarlyCaptureScripts();

  try {
    await chrome.permissions.remove({ origins: [pattern] });
  } catch {
    // A broader grant (cross origin images) covers this pattern and cannot be narrowed.
  }
}

export function isImageAccessEnabled(): Promise<boolean> {
  return hasHostPermission(ALL_URLS_PATTERN);
}

export async function enableImageAccess(): Promise<boolean> {
  return chrome.permissions.request({ origins: [ALL_URLS_PATTERN] });
}

export async function disableImageAccess(): Promise<void> {
  await chrome.permissions.remove({ origins: [ALL_URLS_PATTERN] });
  // Origins enabled only through the broad grant lose their registration.
  await syncEarlyCaptureScripts();
}
