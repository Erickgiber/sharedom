import { getT, onLanguageChange } from '../i18n';
import { capture, downloadCapture, CaptureOptions } from 'sharedom';
import { showToast } from './toast';
import { playCameraShutterSound } from '../utils/audio';
import logoUrl from '../../public/logo.svg';

export function renderPlayground(container: HTMLElement): void {
  let currentScale = 2;
  let currentFormat: 'png' | 'jpeg' | 'webp' = 'png';
  let currentQuality = 0.92;
  let lastDataUrl = '';

  function update(): void {
    const t = getT();

    container.innerHTML = `
      <section class="playground-section" id="playground">
        <div class="section-header anim-in" data-anim-key="playground-header">
          <h2>${t.playground.title}</h2>
          <p>${t.playground.subtitle}</p>
        </div>

        <div class="playground-layout anim-in" style="transition-delay:150ms" data-anim-key="playground-body">
          <!-- Left: Simple Clean Sample Card -->
          <div class="sample-container">
            <div id="playground-card" class="sample-metric-card">
              <div class="card-top">
                <div class="card-brand">
                  <div class="brand-avatar">
                    <img src="${logoUrl}" alt="sharedom logo" width="24" height="24" />
                  </div>
                  <div>
                    <h4>${t.playground.cardTitle}</h4>
                    <p class="brand-sub">${t.playground.cardSub}</p>
                  </div>
                </div>
              </div>

              <div class="card-metrics">
                <div class="metric-item">
                  <span class="m-label">${t.playground.cardStat1Label}</span>
                  <span class="m-val">${t.playground.cardStat1Val}</span>
                </div>
                <div class="metric-item">
                  <span class="m-label">${t.playground.cardStat2Label}</span>
                  <span class="m-val">${t.playground.cardStat2Val}</span>
                </div>
              </div>

              <div class="card-banner">
                <span>${t.playground.cardQuote}</span>
              </div>
            </div>
          </div>

          <!-- Right: Streamlined Control Panel -->
          <div class="controls-container">
            <div class="form-group">
              <label>${t.playground.scaleLabel}</label>
              <div class="btn-group" id="scaleGroup">
                <button type="button" class="btn-opt ${currentScale === 1 ? 'active' : ''}" data-scale="1">1x</button>
                <button type="button" class="btn-opt ${currentScale === 2 ? 'active' : ''}" data-scale="2">2x (Retina)</button>
                <button type="button" class="btn-opt ${currentScale === 3 ? 'active' : ''}" data-scale="3">3x</button>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="play-format">${t.playground.formatLabel}</label>
                <select id="play-format" class="form-control">
                  <option value="png" ${currentFormat === 'png' ? 'selected' : ''}>PNG</option>
                  <option value="jpeg" ${currentFormat === 'jpeg' ? 'selected' : ''}>JPEG</option>
                  <option value="webp" ${currentFormat === 'webp' ? 'selected' : ''}>WebP</option>
                </select>
              </div>

              <div class="form-group flex-1" id="playQualityGroup" style="display: ${currentFormat !== 'png' ? 'block' : 'none'};">
                <label for="play-quality">${t.playground.qualityLabel} <span id="qualityDisplay">${currentQuality}</span></label>
                <input type="range" id="play-quality" min="0.1" max="1" step="0.05" value="${currentQuality}" class="form-range" />
              </div>
            </div>

            <div class="actions-row">
              <button type="button" id="btnPlayCapture" class="btn-primary flex-1">
                ${t.playground.btnCapture}
              </button>
              <button type="button" id="btnPlayDownload" class="btn-outline flex-1">
                ${t.playground.btnDownload}
              </button>
            </div>
          </div>
        </div>

        <!-- Result Box -->
        <div id="playResultSection" class="result-section" style="display: ${lastDataUrl ? 'block' : 'none'};">
          <div class="result-header">
            <h3>${t.playground.resultTitle}</h3>
            <span id="playResultMeta" class="result-meta"></span>
          </div>
          <div class="result-body">
            <div class="result-img-frame" id="playImgFrame">
              <img id="playResultImg" src="${lastDataUrl}" alt="Snapshot" />
            </div>
            <div class="result-btns">
              <button type="button" id="btnCopyDataUrl" class="btn-ghost">${t.playground.copyDataUrl}</button>
            </div>
          </div>
        </div>
      </section>
    `;

    bindEvents();
  }

  function getOptions(): CaptureOptions {
    return {
      scale: currentScale,
      format: currentFormat,
      quality: currentQuality,
    };
  }

  function bindEvents(): void {
    const t = getT();
    const controlsContainer = container.querySelector<HTMLElement>('.controls-container');
    if (controlsContainer) {
      controlsContainer.addEventListener('mousemove', (e) => {
        const rect = controlsContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        controlsContainer.style.setProperty('--ctrl-mouse-x', `${x}px`);
        controlsContainer.style.setProperty('--ctrl-mouse-y', `${y}px`);
      });
    }

    document.querySelectorAll('#scaleGroup .btn-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#scaleGroup .btn-opt').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentScale = Number((btn as HTMLElement).dataset.scale || 2);
      });
    });

    const formatSelect = document.getElementById('play-format') as HTMLSelectElement;
    const qualityGroup = document.getElementById('playQualityGroup');
    formatSelect?.addEventListener('change', () => {
      currentFormat = formatSelect.value as 'png' | 'jpeg' | 'webp';
      if (qualityGroup) {
        qualityGroup.style.display = currentFormat !== 'png' ? 'block' : 'none';
      }
    });

    const qualitySlider = document.getElementById('play-quality') as HTMLInputElement;
    const qualityDisplay = document.getElementById('qualityDisplay');
    qualitySlider?.addEventListener('input', () => {
      currentQuality = Number(qualitySlider.value);
      if (qualityDisplay) qualityDisplay.textContent = currentQuality.toFixed(2);
    });

    const btnCapture = document.getElementById('btnPlayCapture') as HTMLButtonElement;
    const btnDownload = document.getElementById('btnPlayDownload') as HTMLButtonElement;
    const targetElement = '#playground-card';
    const resultSection = document.getElementById('playResultSection') as HTMLElement;
    const resultImg = document.getElementById('playResultImg') as HTMLImageElement;
    const playImgFrame = document.getElementById('playImgFrame');
    const resultMeta = document.getElementById('playResultMeta') as HTMLElement;

    btnCapture?.addEventListener('click', async () => {
      btnCapture.disabled = true;
      playCameraShutterSound();

      try {
        const dataUrl = await capture(targetElement, getOptions());
        lastDataUrl = dataUrl;
        resultSection.style.display = 'block';

        if (playImgFrame) {
          playImgFrame.classList.remove('photo-pop');
          void playImgFrame.offsetWidth;
          playImgFrame.classList.add('photo-pop');
        }

        let handled = false;
        const onImageReady = () => {
          if (handled) return;
          handled = true;
          const approxBytes = Math.round((dataUrl.length * 3) / 4);
          const sizeKb = (approxBytes / 1024).toFixed(1);
          if (resultMeta) {
            resultMeta.textContent = `${resultImg.naturalWidth} × ${resultImg.naturalHeight}px (${currentScale}x, ${currentFormat.toUpperCase()}, ~${sizeKb} KB)`;
          }

          requestAnimationFrame(() => {
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        };

        resultImg.addEventListener('load', onImageReady, { once: true });
        resultImg.src = dataUrl;

        if (resultImg.complete && resultImg.naturalWidth > 0) {
          onImageReady();
        }
      } catch (err) {
        showToast(`${t.playground.failedCapture}: ${(err as Error).message}`);
      } finally {
        btnCapture.disabled = false;
      }
    });

    btnDownload?.addEventListener('click', async () => {
      btnDownload.disabled = true;

      try {
        const filename = `sharedom-${Date.now()}.${currentFormat}`;
        await downloadCapture(targetElement, filename, getOptions());
      } catch (err) {
        showToast(`${t.playground.failedCapture}: ${(err as Error).message}`);
      } finally {
        btnDownload.disabled = false;
      }
    });

    document.getElementById('btnCopyDataUrl')?.addEventListener('click', () => {
      if (!lastDataUrl) return;
      navigator.clipboard.writeText(lastDataUrl);
      showToast(t.playground.copied);
    });
  }

  update();
  onLanguageChange(() => update());
}
