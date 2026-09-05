import { DomTarget, PdfOptions, ConsolePdfOptions, NetworkPdfOptions } from './types';
import { resolveElement, validateElementDimensions, syncDynamicStates } from './dom';
import { cloneComputedStyles } from './styles';
import { inlineImages } from './images';
import { createSvgDataUrl } from './svg';
import { renderSvgToCanvas } from './canvas';
import { buildPdf, buildMultiPagePdf } from './pdf-writer';
import { getConsoleLogs, getNetworkRequests } from './tracker';
import { createConsoleLogsElement, createNetworkRequestsElement, chunkItems } from './renderer';

async function captureAsJpeg(
    target: DomTarget,
    scale: number,
    quality: number,
    backgroundColor: string
): Promise<{ dataUrl: string; widthPx: number; heightPx: number }> {
    const element = resolveElement(target);
    const { width, height } = validateElementDimensions(element);

    const clone = element.cloneNode(true) as HTMLElement;
    syncDynamicStates(element, clone);
    cloneComputedStyles(element, clone);

    clone.style.width     = `${width}px`;
    clone.style.height    = `${height}px`;
    clone.style.boxSizing = 'border-box';
    clone.style.margin    = '0';

    const cleanupImages = await inlineImages(clone);

    try {
        const svgDataUrl = createSvgDataUrl(clone, width, height);
        const dataUrl = await renderSvgToCanvas(svgDataUrl, width, height, {
            scale,
            format: 'jpeg',
            quality,
            backgroundColor,
            optimize: true,
        });

        return {
            dataUrl,
            widthPx:  Math.round(width  * scale),
            heightPx: Math.round(height * scale),
        };
    } finally {
        cleanupImages();
    }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
    const commaIdx  = dataUrl.indexOf(',');
    const base64    = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    const binaryStr = atob(base64);
    const bytes     = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
}

/**
 * Captures a DOM element and returns it as a PDF `Blob`.
 *
 * The element is rendered to a JPEG via the existing `capture()` pipeline,
 * then embedded into a minimal PDF 1.4 binary — all without any external dependencies.
 *
 * @param target  A CSS selector string or an `HTMLElement`.
 * @param options PDF generation options (page size, metadata, quality, etc.).
 * @returns A `Blob` of type `application/pdf`.
 *
 * @example
 * const blob = await capturePDF('#my-report', {
 *   pageSize: 'A4',
 *   title: 'Monthly Report',
 *   author: 'Acme Inc.',
 *   scale: 2,
 * });
 */
export async function capturePDF(
    target: DomTarget,
    options: PdfOptions = {}
): Promise<Blob> {
    const {
        scale           = 2,
        backgroundColor = '#ffffff',
        quality         = 0.92,
        pageSize        = 'auto',
        orientation     = 'portrait',
        margin          = 0,
        title,
        author,
        subject,
        keywords,
    } = options;

    const { dataUrl, widthPx, heightPx } = await captureAsJpeg(
        target,
        scale,
        quality,
        backgroundColor
    );

    const jpegBytes = dataUrlToBytes(dataUrl);

    const pdfBytes = buildPdf(jpegBytes, {
        imageWidthPx:  widthPx,
        imageHeightPx: heightPx,
        dpi: 96 * scale,
        pageSize,
        orientation,
        margin,
        title,
        author,
        subject,
        keywords,
    });

    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Captures a DOM element and immediately triggers a PDF download in the browser.
 *
 * @param target    A CSS selector string or an `HTMLElement`.
 * @param filename  Name for the downloaded file. Defaults to `'capture.pdf'`.
 * @param options   PDF generation options.
 *
 * @example
 * await downloadPDF('#invoice', 'invoice-2024.pdf', {
 *   pageSize: 'Letter',
 *   margin: 28,
 *   title: 'Invoice #1234',
 * });
 */
export async function downloadPDF(
    target: DomTarget,
    filename = 'capture.pdf',
    options: PdfOptions = {}
): Promise<void> {
    if (typeof document === 'undefined') {
        throw new Error(
            '[sharedom]: downloadPDF() requires a browser environment. ' +
            'For SSR environments, use "createPdfFromImageSSR" or "buildPdf" from "sharedom/ssr".'
        );
    }
    const blob = await capturePDF(target, options);
    const url  = URL.createObjectURL(blob);

    try {
        const link = document.createElement('a');
        link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
        link.href     = url;
        link.click();
    } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

/**
 * Captures a DOM element and opens the browser's native Print dialog.
 *
 * @param target  A CSS selector string or an `HTMLElement`.
 * @param options Capture options (`scale`, `quality`, `backgroundColor`, `title`).
 *
 * @example
 * await printElement('#my-card', { scale: 2, title: 'My Card' });
 */
export async function printElement(
    target: DomTarget,
    options: Pick<PdfOptions, 'scale' | 'quality' | 'backgroundColor' | 'title'> = {}
): Promise<void> {
    if (typeof document === 'undefined') {
        throw new Error(
            '[sharedom]: printElement() requires a browser environment with window/document access.'
        );
    }
    const {
        scale           = 2,
        quality         = 0.92,
        backgroundColor = '#ffffff',
        title           = (typeof document !== 'undefined' ? document.title : '') || 'sharedom',
    } = options;

    const { dataUrl } = await captureAsJpeg(target, scale, quality, backgroundColor);

    return new Promise<void>((resolve) => {
        const iframe = document.createElement('iframe');

        Object.assign(iframe.style, {
            position: 'fixed',
            top:      '-9999px',
            left:     '-9999px',
            width:    '1px',
            height:   '1px',
            opacity:  '0',
            border:   'none',
        });

        iframe.onload = () => {
            const doc = iframe.contentDocument;
            if (!doc) {
                document.body.removeChild(iframe);
                return resolve();
            }

            const escaped = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            doc.open();
            doc.write(
                `<!DOCTYPE html><html><head>` +
                `<title>${escaped}</title>` +
                `<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff}img{display:block;width:100%;height:auto;page-break-after:avoid}@page{margin:0}</style>` +
                `</head><body><img src="${dataUrl}" alt="${escaped}"/></body></html>`
            );
            doc.close();

            setTimeout(() => {
                try { iframe.contentWindow?.print(); } catch (_) {}
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    resolve();
                }, 500);
            }, 300);
        };

        document.body.appendChild(iframe);
        iframe.src = 'about:blank';
    });
}

async function captureTemporaryElementPDF(element: HTMLElement, options: PdfOptions): Promise<Blob> {
    const isAttached = typeof document !== 'undefined' && document.body && document.body.contains(element);
    let wrapper: HTMLElement | null = null;

    if (!isAttached && typeof document !== 'undefined' && document.body) {
        wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.top = '-99999px';
        wrapper.style.left = '-99999px';
        wrapper.style.opacity = '0';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.zIndex = '-9999';
        wrapper.appendChild(element);
        document.body.appendChild(wrapper);
    }

    try {
        return await capturePDF(element, options);
    } finally {
        if (wrapper && wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
        }
    }
}

export async function captureConsoleLogsPDF(options: ConsolePdfOptions = {}): Promise<Blob> {
    const logs = options.logs || getConsoleLogs();
    const max = options.maxEntries || 200;
    const sliced = logs.slice(-max);
    const perPage = options.entriesPerPage || 15;
    const chunks = chunkItems(sliced, perPage);

    if (chunks.length <= 1) {
        const element = createConsoleLogsElement(sliced, {
            language: options.language,
            title: options.title,
            maxEntries: options.maxEntries,
        });
        return captureTemporaryElementPDF(element, options);
    }

    const {
        scale = 2,
        quality = 0.92,
        backgroundColor = '#0f172a',
        pageSize = 'auto',
        orientation = 'portrait',
        margin = 0,
        title,
        author,
        subject,
        keywords,
    } = options;

    const pages: { jpegBytes: Uint8Array; imageWidthPx: number; imageHeightPx: number }[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const element = createConsoleLogsElement(chunk, {
            language: options.language,
            title: options.title,
            pageIndex: i + 1,
            totalPages: chunks.length,
            startIndex: i * perPage,
            totalItems: sliced.length,
        });

        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.top = '-99999px';
        wrapper.style.left = '-99999px';
        wrapper.style.opacity = '0';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.zIndex = '-9999';
        wrapper.appendChild(element);
        document.body.appendChild(wrapper);

        try {
            const { dataUrl, widthPx, heightPx } = await captureAsJpeg(
                element,
                scale,
                quality,
                backgroundColor
            );
            pages.push({
                jpegBytes: dataUrlToBytes(dataUrl),
                imageWidthPx: widthPx,
                imageHeightPx: heightPx,
            });
        } finally {
            wrapper.remove();
        }
    }

    const pdfBytes = buildMultiPagePdf({
        pages,
        dpi: 96 * scale,
        pageSize,
        orientation,
        margin,
        title,
        author,
        subject,
        keywords,
    });

    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export async function downloadConsoleLogsPDF(
    filename = 'console-logs.pdf',
    options: ConsolePdfOptions = {}
): Promise<void> {
    if (typeof document === 'undefined') {
        throw new Error('[sharedom]: downloadConsoleLogsPDF() requires a browser environment.');
    }
    const blob = await captureConsoleLogsPDF(options);
    const url = URL.createObjectURL(blob);
    try {
        const link = document.createElement('a');
        link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
        link.href = url;
        link.click();
    } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

export async function captureNetworkRequestsPDF(options: NetworkPdfOptions = {}): Promise<Blob> {
    const requests = options.requests || getNetworkRequests();
    const max = options.maxEntries || 200;
    const sliced = requests.slice(-max);
    const perPage = options.entriesPerPage || 12;
    const chunks = chunkItems(sliced, perPage);

    if (chunks.length <= 1) {
        const element = createNetworkRequestsElement(sliced, {
            language: options.language,
            title: options.title,
            maxEntries: options.maxEntries,
        });
        return captureTemporaryElementPDF(element, options);
    }

    const {
        scale = 2,
        quality = 0.92,
        backgroundColor = '#0f172a',
        pageSize = 'auto',
        orientation = 'portrait',
        margin = 0,
        title,
        author,
        subject,
        keywords,
    } = options;

    const pages: { jpegBytes: Uint8Array; imageWidthPx: number; imageHeightPx: number }[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const element = createNetworkRequestsElement(chunk, {
            language: options.language,
            title: options.title,
            pageIndex: i + 1,
            totalPages: chunks.length,
            startIndex: i * perPage,
            totalItems: sliced.length,
        });

        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.top = '-99999px';
        wrapper.style.left = '-99999px';
        wrapper.style.opacity = '0';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.zIndex = '-9999';
        wrapper.appendChild(element);
        document.body.appendChild(wrapper);

        try {
            const { dataUrl, widthPx, heightPx } = await captureAsJpeg(
                element,
                scale,
                quality,
                backgroundColor
            );
            pages.push({
                jpegBytes: dataUrlToBytes(dataUrl),
                imageWidthPx: widthPx,
                imageHeightPx: heightPx,
            });
        } finally {
            wrapper.remove();
        }
    }

    const pdfBytes = buildMultiPagePdf({
        pages,
        dpi: 96 * scale,
        pageSize,
        orientation,
        margin,
        title,
        author,
        subject,
        keywords,
    });

    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export async function downloadNetworkRequestsPDF(
    filename = 'network-requests.pdf',
    options: NetworkPdfOptions = {}
): Promise<void> {
    if (typeof document === 'undefined') {
        throw new Error('[sharedom]: downloadNetworkRequestsPDF() requires a browser environment.');
    }
    const blob = await captureNetworkRequestsPDF(options);
    const url = URL.createObjectURL(blob);
    try {
        const link = document.createElement('a');
        link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
        link.href = url;
        link.click();
    } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
