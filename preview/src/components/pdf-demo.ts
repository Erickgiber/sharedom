import { capturePDF, PdfPageSize, PdfOptions } from 'sharedom';
import { showToast } from './toast';
import { getT } from '../i18n';
import { trackPointerGlow } from '../utils/pointer-glow';

/** The invoice itself is static markup; only its number is needed at runtime. */
const INVOICE_NUMBER = 'INV-2026-0042';

export function initPdfDemo(container: HTMLElement): void {
  let pageSize: PdfPageSize = 'auto';
  let orientation: 'portrait' | 'landscape' = 'portrait';
  let margin = 0;
  let scale = 2;
  let isGenerating = false;
  let isPreviewing = false;
  let lastBlobUrl = '';

  function setGenerating(v: boolean) {
    isGenerating = v;
    const btn = document.getElementById('btnGenPDF') as HTMLButtonElement | null;
    const spinner = document.getElementById('pdfSpinner');
    const t = getT();
    if (btn) {
      btn.disabled = v;
      const label = btn.querySelector<HTMLSpanElement>('.pdf-btn-label');
      if (label) label.textContent = v ? t.pdfDemo.btnGenerating : t.pdfDemo.btnDownload;
    }
    if (spinner) spinner.style.display = v ? 'inline-block' : 'none';
  }

  function setPreviewing(v: boolean) {
    isPreviewing = v;
    const btn = document.getElementById('btnPreviewPDF') as HTMLButtonElement | null;
    const spinner = document.getElementById('pdfPreviewSpinner');
    const t = getT();
    if (btn) {
      btn.disabled = v;
      const label = btn.querySelector<HTMLSpanElement>('.pdf-btn-preview-label');
      if (label) label.textContent = v ? t.pdfDemo.btnPreviewing : t.pdfDemo.btnPreview;
    }
    if (spinner) spinner.style.display = v ? 'inline-block' : 'none';
  }

  function setStatus(msg: string) {
    const el = document.getElementById('pdfStatus');
    if (el) el.textContent = msg;
  }

  trackPointerGlow(container.querySelector<HTMLElement>('.pdf-ctrl-card'));

  document.querySelectorAll('#pageSizeGroup .btn-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pageSizeGroup .btn-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pageSize = (btn as HTMLElement).dataset.size as PdfPageSize;
      const show = pageSize !== 'auto';
      const orientGroup = document.getElementById('orientGroup');
      const marginGroup = document.getElementById('marginGroup');
      if (orientGroup) orientGroup.style.display = show ? 'block' : 'none';
      if (marginGroup) marginGroup.style.display  = show ? 'block' : 'none';
    });
  });

  document.querySelectorAll('#orientBtnGroup .btn-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#orientBtnGroup .btn-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      orientation = (btn as HTMLElement).dataset.orient as 'portrait' | 'landscape';
    });
  });

  const marginSlider = document.getElementById('marginSlider') as HTMLInputElement | null;
  marginSlider?.addEventListener('input', () => {
    margin = Number(marginSlider.value);
    const display = document.getElementById('marginVal');
    if (display) display.textContent = String(margin);
  });

  document.querySelectorAll('#scaleGroup .btn-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#scaleGroup .btn-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      scale = Number((btn as HTMLElement).dataset.sc ?? 2);
    });
  });

  function getOptions(): PdfOptions {
    return {
      pageSize,
      orientation,
      margin,
      scale,
      backgroundColor: '#ffffff',
      title:   (document.getElementById('pdfTitle')   as HTMLInputElement)?.value || undefined,
      author:  (document.getElementById('pdfAuthor')  as HTMLInputElement)?.value || undefined,
      subject: (document.getElementById('pdfSubject') as HTMLInputElement)?.value || undefined,
    };
  }

  // ── Preview PDF button ──────────────────────────────────────────────────
  document.getElementById('btnPreviewPDF')?.addEventListener('click', async () => {
    if (isPreviewing || isGenerating) return;
    setPreviewing(true);
    setStatus('');

    if (lastBlobUrl) { URL.revokeObjectURL(lastBlobUrl); lastBlobUrl = ''; }

    try {
      const opts = getOptions();
      const blob = await capturePDF('#invoice-card', opts);
      lastBlobUrl = URL.createObjectURL(blob);

      const previewBox   = document.getElementById('pdfPreviewBox');
      const previewFrame = document.getElementById('pdfPreviewFrame') as HTMLIFrameElement | null;
      if (previewBox && previewFrame) {
        previewBox.style.display = 'block';
        previewFrame.src = lastBlobUrl;
        // The blob is already complete and the frame has a fixed height, so the box will not
        // shift once the PDF paints — scrolling now is safe and does not depend on the
        // iframe 'load' event, which never fires where no PDF viewer is available.
        requestAnimationFrame(() => {
          previewBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }

      setStatus(`✓ ${(blob.size / 1024).toFixed(1)} KB · ${pageSize} · ${scale}x`);
      showToast(getT().pdfDemo.previewReady);
    } catch (err) {
      const msg = (err as Error).message;
      showToast(`${getT().pdfDemo.toastError}: ${msg}`);
      setStatus(`✕ ${msg}`);
    } finally {
      setPreviewing(false);
    }
  });

  // ── Close preview button ───────────────────────────────────────────────
  document.getElementById('btnClosePreviewPDF')?.addEventListener('click', () => {
    const previewBox = document.getElementById('pdfPreviewBox');
    if (previewBox) previewBox.style.display = 'none';
  });

  // ── Open in new tab button ──────────────────────────────────────────────
  document.getElementById('btnOpenPDF')?.addEventListener('click', () => {
    if (lastBlobUrl) {
      window.open(lastBlobUrl, '_blank');
    }
  });

  // ── Download PDF button (does NOT open preview box) ─────────────────────
  document.getElementById('btnGenPDF')?.addEventListener('click', async () => {
    if (isGenerating || isPreviewing) return;
    setGenerating(true);
    setStatus('');

    try {
      const opts = getOptions();
      const blob = await capturePDF('#invoice-card', opts);
      const downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `invoice-${INVOICE_NUMBER}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);

      setStatus(`✓ ${(blob.size / 1024).toFixed(1)} KB · ${pageSize} · ${scale}x`);
      showToast(getT().pdfDemo.toastSuccess);
    } catch (err) {
      const msg = (err as Error).message;
      showToast(`${getT().pdfDemo.toastError}: ${msg}`);
      setStatus(`✕ ${msg}`);
    } finally {
      setGenerating(false);
    }
  });
}
