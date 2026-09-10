import { getT, getLanguage, Language } from '../i18n';
import {
  captureConsoleLogs,
  downloadConsoleLogsPDF,
  captureNetworkRequests,
  downloadNetworkRequestsPDF,
  startConsoleCapture,
  startNetworkCapture,
  Language as LibraryLanguage,
} from 'sharedom';
import { showToast } from './toast';

/** Demo captures run at the highest quality tier so the output is shown at full sharpness. */
const PREVIEW_SCALE = 3;

function toLibraryLanguage(lang: Language): LibraryLanguage {
  return lang === 'es' ? 'es' : 'en';
}

export function initTelemetryDemo(): void {
  startConsoleCapture();
  startNetworkCapture();

  function emitSampleLogs(): void {
    console.log('[App] Initialized successfully in environment: production');
    console.info('[Auth] User session verified token_exp=3600');
    console.warn('[Cache] Response time 340ms exceeded budget: 200ms');
    console.error('[Sync] POST /api/v1/sync failed: 500 Internal Server Error');
    console.debug('[DB] Index scan completed on table: orders in 12ms');
  }

  async function emitSampleRequests(): Promise<void> {
    await Promise.all([
      fetch('https://api.example.com/v1/users/me').catch(() => undefined),
      fetch('https://api.example.com/v1/products?limit=10').catch(() => undefined),
    ]);
  }

  /** Lets the loader paint before the capture starts, since cloning styles blocks the main thread. */
  function nextPaint(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  function setLoading(label: string): void {
    const section = document.getElementById('telemetryResultSection');
    const body = document.querySelector('.telemetry-result-body');
    const loaderLabel = document.getElementById('telemetryLoaderLabel');
    const metaEl = document.getElementById('telemetryResultMeta');
    if (!section || !body) return;

    if (label) {
      if (loaderLabel) loaderLabel.textContent = label;
      if (metaEl) metaEl.textContent = '';
      body.classList.add('is-loading');
      section.style.display = 'block';
      requestAnimationFrame(() => {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } else {
      body.classList.remove('is-loading');
    }
  }

  function showResult(dataUrl: string, meta: string): void {
    const section = document.getElementById('telemetryResultSection');
    const img = document.getElementById('telemetryResultImg') as HTMLImageElement | null;
    const metaEl = document.getElementById('telemetryResultMeta');
    if (!section || !img || !metaEl) return;

    metaEl.textContent = meta;
    section.style.display = 'block';

    img.addEventListener(
      'load',
      () => {
        setLoading('');
        requestAnimationFrame(() => {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      },
      { once: true }
    );
    img.src = dataUrl;
    if (img.complete) setLoading('');
  }

  async function runAction(button: HTMLButtonElement, action: () => Promise<void>): Promise<void> {
    if (button.disabled) return;
    button.disabled = true;
    button.classList.add('is-busy');
    try {
      await action();
    } catch (err) {
      setLoading('');
      showToast(`${getT().telemetryDemo.toastError}: ${String(err)}`);
    } finally {
      button.disabled = false;
      button.classList.remove('is-busy');
    }
  }

  const btnCapLogs = document.getElementById('btnCapLogs') as HTMLButtonElement;
  const btnPdfLogs = document.getElementById('btnPdfLogs') as HTMLButtonElement;
  const btnCapNetwork = document.getElementById('btnCapNetwork') as HTMLButtonElement;
  const btnPdfNetwork = document.getElementById('btnPdfNetwork') as HTMLButtonElement;

  btnCapLogs?.addEventListener('click', () =>
    runAction(btnCapLogs, async () => {
      const t = getT();
      emitSampleLogs();
      setLoading(t.telemetryDemo.loaderConsole);
      await nextPaint();
      showResult(
        await captureConsoleLogs({ language: toLibraryLanguage(getLanguage()), scale: PREVIEW_SCALE }),
        `${t.telemetryDemo.metaConsole} • PNG • ${PREVIEW_SCALE}x`
      );
      showToast(t.telemetryDemo.toastLogsCaptured);
    })
  );

  btnPdfLogs?.addEventListener('click', () =>
    runAction(btnPdfLogs, async () => {
      emitSampleLogs();
      await downloadConsoleLogsPDF('console-logs.pdf', {
        language: toLibraryLanguage(getLanguage()),
        scale: PREVIEW_SCALE,
      });
      showToast(getT().telemetryDemo.toastLogsPdf);
    })
  );

  btnCapNetwork?.addEventListener('click', () =>
    runAction(btnCapNetwork, async () => {
      const t = getT();
      await emitSampleRequests();
      setLoading(t.telemetryDemo.loaderNetwork);
      await nextPaint();
      showResult(
        await captureNetworkRequests({ language: toLibraryLanguage(getLanguage()), scale: PREVIEW_SCALE }),
        `${t.telemetryDemo.metaNetwork} • PNG • ${PREVIEW_SCALE}x`
      );
      showToast(t.telemetryDemo.toastNetworkCaptured);
    })
  );

  btnPdfNetwork?.addEventListener('click', () =>
    runAction(btnPdfNetwork, async () => {
      await emitSampleRequests();
      await downloadNetworkRequestsPDF('network-requests.pdf', {
        language: toLibraryLanguage(getLanguage()),
        scale: PREVIEW_SCALE,
      });
      showToast(getT().telemetryDemo.toastNetworkPdf);
    })
  );
}
