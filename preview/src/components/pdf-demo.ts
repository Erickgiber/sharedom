import { capturePDF, PdfPageSize, PdfOptions } from 'sharedom';
import { showToast } from './toast';
import { getT, onLanguageChange } from '../i18n';

const INVOICE = {
  number: 'INV-2026-0042',
  date: 'September 1, 2026',
  due: 'September 15, 2026',
  from: { name: 'sharedom Studio', email: 'hello@sharedom.dev', address: '123 Dev Lane, San Francisco, CA 94107' },
  to:   { name: 'Acme Corporation', email: 'billing@acme.io',   address: '456 Business Ave, New York, NY 10001' },
  items: [
    { desc: 'UI Component Library License', qty: 1, unit: 299.00 },
    { desc: 'Annual Support & Maintenance',  qty: 1, unit: 149.00 },
    { desc: 'Custom Theme Integration',      qty: 3, unit:  59.00 },
    { desc: 'Developer Consulting Hours',    qty: 4, unit:  95.00 },
  ],
};

function calcInvoice() {
  const subtotal = INVOICE.items.reduce((s, i) => s + i.qty * i.unit, 0);
  const tax = subtotal * 0.08;
  return { subtotal, tax, total: subtotal + tax };
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function buildInvoiceHTML(logoUrl: string): string {
  const { subtotal, tax, total } = calcInvoice();
  const rows = INVOICE.items.map((item, i) => `
    <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td class="td-desc">${item.desc}</td>
      <td class="td-num">${item.qty}</td>
      <td class="td-num">${fmt(item.unit)}</td>
      <td class="td-num td-total">${fmt(item.qty * item.unit)}</td>
    </tr>`).join('');

  return `
    <div class="inv-header">
      <div class="inv-brand">
        <img src="${logoUrl}" alt="sharedom" class="inv-logo" />
        <span class="inv-brand-name">sharedom</span>
      </div>
      <div class="inv-meta">
        <h2 class="inv-title">INVOICE</h2>
        <p class="inv-number">${INVOICE.number}</p>
      </div>
    </div>
    <div class="inv-parties">
      <div class="inv-party">
        <p class="party-label">FROM</p>
        <p class="party-name">${INVOICE.from.name}</p>
        <p class="party-detail">${INVOICE.from.email}</p>
        <p class="party-detail">${INVOICE.from.address}</p>
      </div>
      <div class="inv-party">
        <p class="party-label">BILL TO</p>
        <p class="party-name">${INVOICE.to.name}</p>
        <p class="party-detail">${INVOICE.to.email}</p>
        <p class="party-detail">${INVOICE.to.address}</p>
      </div>
      <div class="inv-party">
        <div>
          <p class="party-label">ISSUE DATE</p>
          <p class="party-name">${INVOICE.date}</p>
        </div>
        <div style="margin-top:12px">
          <p class="party-label">DUE DATE</p>
          <p class="party-name inv-due">${INVOICE.due}</p>
        </div>
      </div>
    </div>
    <table class="inv-table">
      <thead>
        <tr>
          <th class="th-desc">Description</th>
          <th class="th-num">Qty</th>
          <th class="th-num">Unit Price</th>
          <th class="th-num">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="inv-summary">
      <div class="inv-summary-rows">
        <div class="summary-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
        <div class="summary-row"><span>Tax (8%)</span><span>${fmt(tax)}</span></div>
        <div class="summary-row summary-total"><span>Total Due</span><span>${fmt(total)}</span></div>
      </div>
    </div>
    <div class="inv-footer">
      <p>Thank you for your business! Payment is due within 14 days.</p>
      <p class="inv-footer-sub">Questions? Contact us at hello@sharedom.dev · sharedom.dev</p>
    </div>
  `;
}

export function renderPdfDemo(container: HTMLElement): void {
  let pageSize: PdfPageSize = 'auto';
  let orientation: 'portrait' | 'landscape' = 'portrait';
  let margin = 0;
  let scale = 2;
  let isGenerating = false;
  let isPreviewing = false;
  let lastBlobUrl = '';

  const logoUrl = new URL('../../public/logo.svg', import.meta.url).href;

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

  function render() {
    const t = getT();

    container.innerHTML = `
      <section class="pdf-section" id="pdf-demo">
        <div class="section-header anim-in" data-anim-key="pdf-header">
          <h2>${t.pdfDemo.title}</h2>
          <p>${t.pdfDemo.subtitle}</p>
        </div>
        <div class="pdf-demo-layout anim-in" id="pdfDemoLayout" style="transition-delay:150ms" data-anim-key="pdf-body">
          <div class="pdf-preview-col">
            <div class="pdf-invoice-wrapper">
              <div id="invoice-card" class="invoice-card">
                ${buildInvoiceHTML(logoUrl)}
              </div>
            </div>
          </div>
          <div class="pdf-controls-col">
            <div class="pdf-ctrl-card">
              <h3 class="pdf-ctrl-title">${t.pdfDemo.exportOptions}</h3>
              <div class="pdf-form-group">
                <label class="pdf-label">${t.pdfDemo.pageSizeLabel}</label>
                <div class="btn-group" id="pageSizeGroup">
                  <button type="button" class="btn-opt ${pageSize === 'auto'   ? 'active' : ''}" data-size="auto">Auto</button>
                  <button type="button" class="btn-opt ${pageSize === 'A4'     ? 'active' : ''}" data-size="A4">A4</button>
                  <button type="button" class="btn-opt ${pageSize === 'Letter' ? 'active' : ''}" data-size="Letter">Letter</button>
                  <button type="button" class="btn-opt ${pageSize === 'A3'     ? 'active' : ''}" data-size="A3">A3</button>
                </div>
              </div>
              <div class="pdf-form-group" id="orientGroup" style="display:${pageSize !== 'auto' ? 'block' : 'none'}">
                <label class="pdf-label">${t.pdfDemo.orientationLabel}</label>
                <div class="btn-group" id="orientBtnGroup">
                  <button type="button" class="btn-opt ${orientation === 'portrait'  ? 'active' : ''}" data-orient="portrait">${t.pdfDemo.portrait}</button>
                  <button type="button" class="btn-opt ${orientation === 'landscape' ? 'active' : ''}" data-orient="landscape">${t.pdfDemo.landscape}</button>
                </div>
              </div>
              <div class="pdf-form-group" id="marginGroup" style="display:${pageSize !== 'auto' ? 'block' : 'none'}">
                <label class="pdf-label">${t.pdfDemo.marginLabel} — <span id="marginVal">${margin}</span> ${t.pdfDemo.marginUnit}</label>
                <input type="range" id="marginSlider" min="0" max="56" step="4" value="${margin}" class="form-range" />
              </div>
              <div class="pdf-form-group">
                <label class="pdf-label">${t.pdfDemo.scaleLabel}</label>
                <div class="btn-group" id="scaleGroup">
                  <button type="button" class="btn-opt ${scale === 1 ? 'active' : ''}" data-sc="1">1x</button>
                  <button type="button" class="btn-opt ${scale === 2 ? 'active' : ''}" data-sc="2">2x (Retina)</button>
                  <button type="button" class="btn-opt ${scale === 3 ? 'active' : ''}" data-sc="3">3x</button>
                </div>
              </div>
              <div class="pdf-form-group">
                <label class="pdf-label">${t.pdfDemo.metadataLabel}</label>
                <input type="text" id="pdfTitle"   class="pdf-input" placeholder="${t.pdfDemo.titlePlaceholder}"   value="Invoice ${INVOICE.number}" />
                <input type="text" id="pdfAuthor"  class="pdf-input" placeholder="${t.pdfDemo.authorPlaceholder}"  value="sharedom Studio" style="margin-top:8px" />
                <input type="text" id="pdfSubject" class="pdf-input" placeholder="${t.pdfDemo.subjectPlaceholder}" value="Client Invoice — Acme Corporation" style="margin-top:8px" />
              </div>
              <div class="pdf-actions">
                <button type="button" id="btnPreviewPDF" class="pdf-btn-outline">
                  <span id="pdfPreviewSpinner" class="pdf-spinner" style="display:none"></span>
                  <span class="pdf-btn-preview-label">${t.pdfDemo.btnPreview}</span>
                </button>
                <button type="button" id="btnGenPDF" class="btn-primary pdf-btn-main">
                  <span id="pdfSpinner" class="pdf-spinner" style="display:none"></span>
                  <span class="pdf-btn-label">${t.pdfDemo.btnDownload}</span>
                </button>
              </div>
              <p id="pdfStatus" class="pdf-status"></p>
            </div>
          </div>
          <div id="pdfPreviewBox" class="pdf-preview-box" style="display:none">
            <div class="pdf-preview-topbar">
              <p class="pdf-preview-label" style="margin:0">${t.pdfDemo.lastPdf}</p>
              <button type="button" id="btnClosePreviewPDF" class="pdf-preview-close" title="Close">✕</button>
            </div>
            <iframe id="pdfPreviewFrame" class="pdf-preview-iframe" title="PDF Preview"></iframe>
            <div class="pdf-preview-actions">
              <button type="button" id="btnOpenPDF" class="btn-ghost">${t.pdfDemo.openNewTab}</button>
            </div>
          </div>
        </div>
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const t = getT();

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

        const layout       = document.getElementById('pdfDemoLayout');
        const previewBox   = document.getElementById('pdfPreviewBox');
        const previewFrame = document.getElementById('pdfPreviewFrame') as HTMLIFrameElement | null;
        if (previewBox && previewFrame) {
          if (layout) layout.classList.add('has-preview');
          previewBox.style.display = 'flex';
          previewFrame.src = lastBlobUrl;
          if (window.innerWidth <= 1024) {
            previewBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }

        setStatus(`✓ ${(blob.size / 1024).toFixed(1)} KB · ${pageSize} · ${scale}x`);
        showToast(t.pdfDemo.previewReady);
      } catch (err) {
        const msg = (err as Error).message;
        showToast(`${t.pdfDemo.toastError}: ${msg}`);
        setStatus(`✕ ${msg}`);
      } finally {
        setPreviewing(false);
      }
    });

    // ── Close preview button ───────────────────────────────────────────────
    document.getElementById('btnClosePreviewPDF')?.addEventListener('click', () => {
      const layout     = document.getElementById('pdfDemoLayout');
      const previewBox = document.getElementById('pdfPreviewBox');
      if (previewBox) {
        previewBox.style.display = 'none';
        if (layout) layout.classList.remove('has-preview');
      }
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
        link.download = `invoice-${INVOICE.number}.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);

        setStatus(`✓ ${(blob.size / 1024).toFixed(1)} KB · ${pageSize} · ${scale}x`);
        showToast(t.pdfDemo.toastSuccess);
      } catch (err) {
        const msg = (err as Error).message;
        showToast(`${t.pdfDemo.toastError}: ${msg}`);
        setStatus(`✕ ${msg}`);
      } finally {
        setGenerating(false);
      }
    });
  }

  render();
  onLanguageChange(() => render());
}
