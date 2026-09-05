import { getT, onLanguageChange, getLanguage } from '../i18n';
import {
  captureConsoleLogs,
  downloadConsoleLogsPDF,
  captureNetworkRequests,
  downloadNetworkRequestsPDF,
  startConsoleCapture,
  startNetworkCapture,
} from 'sharedom';
import { showToast } from './toast';

export function renderTelemetryDemo(container: HTMLElement): void {
  startConsoleCapture();
  startNetworkCapture();

  let previewDataUrl = '';
  let previewMeta = '';

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

  function showResult(dataUrl: string, meta: string): void {
    previewDataUrl = dataUrl;
    previewMeta = meta;

    const section = document.getElementById('telemetryResultSection');
    const img = document.getElementById('telemetryResultImg') as HTMLImageElement | null;
    const metaEl = document.getElementById('telemetryResultMeta');
    if (!section || !img || !metaEl) return;

    metaEl.textContent = meta;
    section.style.display = 'block';

    img.addEventListener(
      'load',
      () => {
        requestAnimationFrame(() => {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      },
      { once: true }
    );
    img.src = dataUrl;
  }

  async function runAction(button: HTMLButtonElement, action: () => Promise<void>): Promise<void> {
    if (button.disabled) return;
    button.disabled = true;
    try {
      await action();
    } catch (err) {
      showToast(`Capture failed: ${String(err)}`);
    } finally {
      button.disabled = false;
    }
  }

  function update(): void {
    const t = getT();
    const lang = getLanguage();

    container.innerHTML = `
      <section class="playground-section telemetry-section" id="telemetry-demo">
        <div class="section-header anim-in" data-anim-key="telemetry-header">
          <h2>${t.telemetryDemo.title}</h2>
          <p>${t.telemetryDemo.subtitle}</p>
        </div>

        <div class="telemetry-grid">
          <article class="telemetry-card anim-in" style="transition-delay:0ms" data-anim-key="telemetry-console">
            <div class="telemetry-card-content">
              <div class="telemetry-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="m6 9 3 3-3 3"></path>
                  <path d="M12 15h5"></path>
                </svg>
              </div>
              <h3 class="telemetry-card-title">${t.telemetryDemo.consoleCardTitle}</h3>
              <p class="telemetry-card-desc">${t.telemetryDemo.consoleCardDesc}</p>
              <div class="telemetry-actions">
                <button type="button" id="btnCapLogs" class="btn-primary telemetry-btn">
                  ${t.telemetryDemo.btnCaptureLogs}
                </button>
                <button type="button" id="btnPdfLogs" class="btn-outline telemetry-btn">
                  ${t.telemetryDemo.btnDownloadLogsPdf}
                </button>
              </div>
            </div>
          </article>

          <article class="telemetry-card anim-in" style="transition-delay:120ms" data-anim-key="telemetry-network">
            <div class="telemetry-card-content">
              <div class="telemetry-icon telemetry-icon--network">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M2 12h20"></path>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"></path>
                </svg>
              </div>
              <h3 class="telemetry-card-title">${t.telemetryDemo.networkCardTitle}</h3>
              <p class="telemetry-card-desc">${t.telemetryDemo.networkCardDesc}</p>
              <div class="telemetry-actions">
                <button type="button" id="btnCapNetwork" class="btn-primary telemetry-btn">
                  ${t.telemetryDemo.btnCaptureNetwork}
                </button>
                <button type="button" id="btnPdfNetwork" class="btn-outline telemetry-btn">
                  ${t.telemetryDemo.btnDownloadNetworkPdf}
                </button>
              </div>
            </div>
          </article>
        </div>

        <div id="telemetryResultSection" class="result-section telemetry-result" style="display: ${previewDataUrl ? 'block' : 'none'};">
          <div class="result-header">
            <h3>${t.telemetryDemo.resultTitle}</h3>
            <span id="telemetryResultMeta" class="result-meta">${previewMeta}</span>
          </div>
          <div class="result-body telemetry-result-body">
            <img id="telemetryResultImg" src="${previewDataUrl}" alt="Telemetry Capture Result" class="telemetry-result-img" />
          </div>
        </div>
      </section>
    `;

    const btnCapLogs = document.getElementById('btnCapLogs') as HTMLButtonElement;
    const btnPdfLogs = document.getElementById('btnPdfLogs') as HTMLButtonElement;
    const btnCapNetwork = document.getElementById('btnCapNetwork') as HTMLButtonElement;
    const btnPdfNetwork = document.getElementById('btnPdfNetwork') as HTMLButtonElement;

    btnCapLogs?.addEventListener('click', () =>
      runAction(btnCapLogs, async () => {
        emitSampleLogs();
        showResult(await captureConsoleLogs({ language: lang }), 'Console Logs • PNG');
        showToast('Console logs captured!');
      })
    );

    btnPdfLogs?.addEventListener('click', () =>
      runAction(btnPdfLogs, async () => {
        emitSampleLogs();
        await downloadConsoleLogsPDF('console-logs.pdf', { language: lang });
        showToast('Console logs PDF downloaded!');
      })
    );

    btnCapNetwork?.addEventListener('click', () =>
      runAction(btnCapNetwork, async () => {
        await emitSampleRequests();
        showResult(await captureNetworkRequests({ language: lang }), 'Network Requests • PNG');
        showToast('Network requests captured!');
      })
    );

    btnPdfNetwork?.addEventListener('click', () =>
      runAction(btnPdfNetwork, async () => {
        await emitSampleRequests();
        await downloadNetworkRequestsPDF('network-requests.pdf', { language: lang });
        showToast('Network requests PDF downloaded!');
      })
    );
  }

  update();
  onLanguageChange(update);
}
