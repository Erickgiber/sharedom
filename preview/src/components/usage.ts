import { getT, onLanguageChange } from '../i18n';
import { showToast } from './toast';
import { highlightCode } from '../utils/highlighter';

type UsageSection = 'client' | 'ssr';

export function renderUsage(container: HTMLElement): void {
  let activeSection: UsageSection = 'client';
  let activeClientTab = 0;
  let activeSsrTab = 0;
  let isRevealed = false;

  const clientSnippets = [
    {
      getLabel: (t: ReturnType<typeof getT>) => t.usage.subTabBasic,
      filename: 'client-basic.ts',
      getCode: (t: ReturnType<typeof getT>) => `import { capture } from 'sharedom';

${t.usage.commentBasic1}
const dataUrl = await capture('#playground-card');

${t.usage.commentBasic2}
const image = document.querySelector('img');
if (image) image.src = dataUrl;`,
    },
    {
      getLabel: (t: ReturnType<typeof getT>) => t.usage.subTabOptions,
      filename: 'client-options.ts',
      getCode: (t: ReturnType<typeof getT>) => `import { capture } from 'sharedom';

${t.usage.commentOptions}
const dataUrl = await capture('#hero-section', {
  scale: 2,
  format: 'jpeg',
  quality: 0.95,
});`,
    },
    {
      getLabel: (t: ReturnType<typeof getT>) => t.usage.subTabDownload,
      filename: 'client-download.ts',
      getCode: (t: ReturnType<typeof getT>) => `import { downloadCapture } from 'sharedom';

${t.usage.commentDownload}
await downloadCapture('#report-table', 'analytics-report.png', {
  scale: 2,
  format: 'png',
});`,
    },
    {
      getLabel: () => 'PDF Export',
      filename: 'client-pdf.ts',
      getCode: () => `import { downloadPDF, capturePDF } from 'sharedom';

// Direct PDF download with page presets and metadata
await downloadPDF('#invoice-card', 'invoice.pdf', {
  pageSize: 'A4',
  orientation: 'portrait',
  margin: 20,
  scale: 2,
  title: 'Invoice INV-2026-0042',
  author: 'sharedom Studio',
});

// Or get the raw PDF Blob for preview
const pdfBlob = await capturePDF('#invoice-card', { pageSize: 'A4' });`,
    },
  ];

  const ssrSnippets = [
    {
      getLabel: (t: ReturnType<typeof getT>) => t.usage.subTabClientFetch,
      filename: 'fetch-screenshot.ts',
      getCode: (t: ReturnType<typeof getT>) => `${t.usage.commentFetch1}
const card = document.querySelector('#my-card');
const html = card ? card.outerHTML : '<div class="banner">Hello World</div>';

${t.usage.commentFetch2}
const response = await fetch('/api/screenshot', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ html }),
});

${t.usage.commentFetch3}
const blob = await response.blob();
const imageUrl = URL.createObjectURL(blob);
const img = document.querySelector('img');
if (img) img.src = imageUrl;`,
    },
    {
      getLabel: (t: ReturnType<typeof getT>) => t.usage.subTabNextjs,
      filename: 'app/api/screenshot/route.ts',
      getCode: () => `import { captureSSR } from 'sharedom/ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { html } = await request.json();

  const buffer = await captureSSR(html, {
    scale: 2,
    format: 'png',
    viewport: { width: 1200, height: 630 },
  });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
} `,
    },
    {
      getLabel: (t: ReturnType<typeof getT>) => t.usage.subTabSvelte,
      filename: 'src/routes/api/screenshot/+server.ts',
      getCode: () => `import { captureSSR } from 'sharedom/ssr';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { html } = await request.json();

  const buffer = await captureSSR(html, {
    scale: 2,
    format: 'png',
    viewport: { width: 1200, height: 630 },
  });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
    },
  });
};`,
    },
    {
      getLabel: (t: ReturnType<typeof getT>) => t.usage.subTabNode,
      filename: 'server.ts',
      getCode: () => `import { captureSSR } from 'sharedom/ssr';
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/snap', async (req, res) => {
  const { html } = req.body;
  const imageBuffer = await captureSSR(html, { scale: 2 });

  res.setHeader('Content-Type', 'image/png');
  res.send(Buffer.from(imageBuffer));
});`,
    },
    {
      getLabel: () => 'Next.js PDF',
      filename: 'app/api/pdf/route.ts',
      getCode: () => `import { createPdfFromImageSSR } from 'sharedom/ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { image, title } = await request.json();

  // Generates valid PDF 1.4 Uint8Array directly from image bytes or Data URL
  const pdfBytes = createPdfFromImageSSR(image, {
    pageSize: 'A4',
    orientation: 'portrait',
    margin: 28,
    title: title || 'Server Document',
  });

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="document.pdf"',
    },
  });
}`,
    },
  ];

  function getActiveSnippet() {
    const currentSnippets = activeSection === 'client' ? clientSnippets : ssrSnippets;
    const currentTab = activeSection === 'client' ? activeClientTab : activeSsrTab;
    return currentSnippets[currentTab] || currentSnippets[0];
  }

  function updateCodeBlockOnly(): void {
    const t = getT();
    const currentSnippets = activeSection === 'client' ? clientSnippets : ssrSnippets;
    const currentTab = activeSection === 'client' ? activeClientTab : activeSsrTab;
    const activeSnippet = getActiveSnippet();
    const code = activeSnippet.getCode(t);
    const highlightedRows = highlightCode(code);

    // Update segment buttons
    document.querySelectorAll('#usageSegmentPill .segment-btn').forEach((btn) => {
      const sec = (btn as HTMLElement).dataset.section;
      if (sec === activeSection) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update tabs container
    const tabsContainer = document.getElementById('usageSubTabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = currentSnippets
        .map(
          (s, i) =>
            `<button type="button" class="tab ${i === currentTab ? 'active' : ''}" data-tab="${i}">${s.getLabel(t)}</button>`
        )
        .join('');

      tabsContainer.querySelectorAll('.tab').forEach((tabBtn) => {
        tabBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const tabIdx = Number((tabBtn as HTMLElement).dataset.tab || 0);
          if (activeSection === 'client') {
            activeClientTab = tabIdx;
          } else {
            activeSsrTab = tabIdx;
          }
          updateCodeBlockOnly();
          (tabBtn as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        });
      });
    }

    // Update code block content
    const codeLang = container.querySelector('.code-lang');
    if (codeLang) codeLang.textContent = activeSnippet.filename;

    const pre = container.querySelector('pre');
    if (pre) pre.innerHTML = highlightedRows;
  }

  function enableDragScroll(element: HTMLElement | null): () => void {
    if (!element) return () => {};

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let isDragging = false;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDown = true;
      isDragging = false;
      startX = e.pageX - element.offsetLeft;
      scrollLeft = element.scrollLeft;
      element.classList.add('is-dragging');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - element.offsetLeft;
      const walk = x - startX;
      if (Math.abs(walk) > 4) {
        isDragging = true;
      }
      element.scrollLeft = scrollLeft - walk;
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      element.classList.remove('is-dragging');
      setTimeout(() => {
        isDragging = false;
      }, 50);
    };

    const onClickCapture = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    element.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    element.addEventListener('click', onClickCapture, true);

    return () => {
      element.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      element.removeEventListener('click', onClickCapture, true);
    };
  }

  function renderFull(): void {
    const t = getT();
    const currentSnippets = activeSection === 'client' ? clientSnippets : ssrSnippets;
    const currentTab = activeSection === 'client' ? activeClientTab : activeSsrTab;
    const activeSnippet = getActiveSnippet();
    const code = activeSnippet.getCode(t);
    const highlightedRows = highlightCode(code);

    const visClass = isRevealed ? 'visible' : '';

    container.innerHTML = `
      <section class="usage" id="usage">
        <div class="section-header anim-in ${visClass}" data-anim-key="usage-header">
          <h2>${t.usage.title}</h2>
          <p class="usage-sub">${t.usage.subtitle}</p>
        </div>

        <div class="anim-in ${visClass}" style="transition-delay:80ms" data-anim-key="usage-body">
          <!-- Section Switcher: Client vs SSR -->
          <div class="usage-segment-row">
            <div class="segment-pill" id="usageSegmentPill">
              <button type="button" class="segment-btn ${activeSection === 'client' ? 'active' : ''}" data-section="client">
                ${t.usage.sectionClient}
              </button>
              <button type="button" class="segment-btn ${activeSection === 'ssr' ? 'active' : ''}" data-section="ssr">
                ${t.usage.sectionSsr}
              </button>
            </div>
          </div>

          <!-- Sub-tabs for current section -->
          <div class="tabs" id="usageSubTabs">
            ${currentSnippets
              .map(
                (s, i) =>
                  `<button type="button" class="tab ${i === currentTab ? 'active' : ''}" data-tab="${i}">${s.getLabel(t)}</button>`
              )
              .join('')}
          </div>

          <div class="code-block" id="codeBlock">
            <div class="code-header">
              <div class="code-dots">
                <div class="dot dot-r"></div>
                <div class="dot dot-y"></div>
                <div class="dot dot-g"></div>
              </div>
              <span class="code-lang">${activeSnippet.filename}</span>
              <button type="button" class="copy-btn" id="copyCodeBtn">${t.usage.copy}</button>
            </div>
            <pre>${highlightedRows}</pre>
          </div>
        </div>
      </section>
    `;

    // Track intersection to flag revealed
    const usageEl = container.querySelector('.usage');
    if (usageEl && !isRevealed) {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            isRevealed = true;
            obs.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      obs.observe(usageEl);
    }

    enableDragScroll(document.getElementById('usageSubTabs'));
    enableDragScroll(document.getElementById('usageSegmentPill'));

    document.querySelectorAll('#usageSegmentPill .segment-btn').forEach((segBtn) => {
      segBtn.addEventListener('click', (e) => {
        e.preventDefault();
        activeSection = ((segBtn as HTMLElement).dataset.section || 'client') as UsageSection;
        updateCodeBlockOnly();
      });
    });

    document.querySelectorAll('#usageSubTabs .tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const tabIdx = Number((tabBtn as HTMLElement).dataset.tab || 0);
        if (activeSection === 'client') {
          activeClientTab = tabIdx;
        } else {
          activeSsrTab = tabIdx;
        }
        updateCodeBlockOnly();
        (tabBtn as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      });
    });

    document.getElementById('copyCodeBtn')?.addEventListener('click', () => {
      const current = getActiveSnippet();
      const code = current.getCode(getT());
      navigator.clipboard.writeText(code);
      const btn = document.getElementById('copyCodeBtn');
      if (btn) btn.textContent = t.usage.copied;
      showToast(t.usage.copied);
      setTimeout(() => {
        if (btn) btn.textContent = t.usage.copy;
      }, 1800);
    });
  }

  renderFull();
  onLanguageChange(() => {
    isRevealed = true;
    renderFull();
  });
}
