import { getT } from '../i18n';
import { capture, downloadCapture, CaptureOptions } from 'sharedom';
import { showToast } from './toast';
import { playCameraShutterSound } from '../utils/audio';
import { trackPointerGlow } from '../utils/pointer-glow';

export function initPlayground(container: HTMLElement): void {
  let currentScale = 2;
  let currentFormat: 'png' | 'jpeg' | 'webp' = 'png';
  let currentQuality = 0.92;
  let lastDataUrl = '';

  function getOptions(): CaptureOptions {
    return {
      scale: currentScale,
      format: currentFormat,
      quality: currentQuality,
    };
  }

  trackPointerGlow(container.querySelector<HTMLElement>('.controls-container'));

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
      showToast(`${getT().playground.failedCapture}: ${(err as Error).message}`);
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
      showToast(`${getT().playground.failedCapture}: ${(err as Error).message}`);
    } finally {
      btnDownload.disabled = false;
    }
  });

  document.getElementById('btnCopyDataUrl')?.addEventListener('click', () => {
    if (!lastDataUrl) return;
    navigator.clipboard.writeText(lastDataUrl);
    showToast(getT().playground.copied);
  });
}
