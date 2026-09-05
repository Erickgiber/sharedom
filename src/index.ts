import {
    CaptureOptions,
    DomTarget,
    DOMTarget,
    ConsoleCaptureOptions,
    NetworkCaptureOptions,
    Language,
} from './types';
import { resolveElement, validateElementDimensions, validateOptions, syncDynamicStates } from './dom';
import { cloneComputedStyles } from './styles';
import { inlineImages } from './images';
import { createSvgDataUrl } from './svg';
import { renderSvgToCanvas } from './canvas';
import { getConsoleLogs, getNetworkRequests } from './tracker';
import { createConsoleLogsElement, createNetworkRequestsElement, chunkItems } from './renderer';
import { downloadZip } from './zip-writer';

export type {
    CaptureOptions,
    DomTarget,
    DOMTarget,
    PdfOptions,
    PdfPageSize,
    Language,
    LogLevel,
    HttpMethod,
    ConsoleLogEntry,
    NetworkRequestEntry,
    ConsoleCaptureOptions,
    ConsolePdfOptions,
    NetworkCaptureOptions,
    NetworkPdfOptions,
    ZipFileInput,
} from './types';
export type { PdfBuildOptions, MultiPagePdfBuildOptions } from './pdf-writer';
export {
    capturePDF,
    downloadPDF,
    printElement,
    captureConsoleLogsPDF,
    downloadConsoleLogsPDF,
    captureNetworkRequestsPDF,
    downloadNetworkRequestsPDF,
} from './pdf';
export { buildPdf, buildMultiPagePdf } from './pdf-writer';
export { buildZip, downloadZip, crc32, normalizeZipData } from './zip-writer';
export {
    createConsoleLogsElement,
    createNetworkRequestsElement,
    chunkItems,
} from './renderer';
export {
    startConsoleCapture,
    stopConsoleCapture,
    getConsoleLogs,
    clearConsoleLogs,
    startNetworkCapture,
    stopNetworkCapture,
    getNetworkRequests,
    clearNetworkRequests,
} from './tracker';
export { setLanguage, getLanguage } from './i18n';

export async function capture(target: DomTarget, options: CaptureOptions = {}): Promise<string> {
    validateOptions(options);

    const element = resolveElement(target);
    const { width, height } = validateElementDimensions(element);

    const targetWidth = options.width ?? width;
    const targetHeight = options.height ?? height;

    const clone = element.cloneNode(true) as HTMLElement;
    syncDynamicStates(element, clone);
    cloneComputedStyles(element, clone);

    clone.style.width = `${targetWidth}px`;
    clone.style.height = `${targetHeight}px`;
    clone.style.boxSizing = 'border-box';
    clone.style.margin = '0';

    const cleanupImages = await inlineImages(clone);

    try {
        const svgDataUrl = createSvgDataUrl(clone, targetWidth, targetHeight);
        return await renderSvgToCanvas(svgDataUrl, targetWidth, targetHeight, options);
    } finally {
        cleanupImages();
    }
}

export async function downloadCapture(
    target: DomTarget,
    filename = 'screenshot.png',
    options: CaptureOptions = {}
): Promise<void> {
    if (typeof document === 'undefined') {
        throw new Error(
            '[sharedom]: downloadCapture() requires a browser environment. ' +
            'For SSR environments, use "captureSSR" from "sharedom/ssr".'
        );
    }
    const dataUrl = await capture(target, options);
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
}

async function captureTemporaryElement(element: HTMLElement, options: CaptureOptions = {}): Promise<string> {
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
        return await capture(element, options);
    } finally {
        if (wrapper && wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
        }
    }
}

export async function captureConsoleLogs(options: ConsoleCaptureOptions = {}): Promise<string> {
    const pages = await captureConsoleLogsPages(options);
    return pages[0] || '';
}

export async function captureConsoleLogsPages(options: ConsoleCaptureOptions = {}): Promise<string[]> {
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
        const dataUrl = await captureTemporaryElement(element, options);
        return [dataUrl];
    }

    const dataUrls: string[] = [];
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
        const url = await captureTemporaryElement(element, options);
        dataUrls.push(url);
    }
    return dataUrls;
}

export async function downloadConsoleLogs(
    filename = 'console-logs.png',
    options: ConsoleCaptureOptions = {}
): Promise<void> {
    if (typeof document === 'undefined') {
        throw new Error('[sharedom]: downloadConsoleLogs() requires a browser environment.');
    }
    const pages = await captureConsoleLogsPages(options);
    const dotIdx = filename.lastIndexOf('.');
    const base = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
    const ext = dotIdx > 0 ? filename.slice(dotIdx) : '.png';

    if (pages.length > 1) {
        const zipFiles = pages.map((url, i) => ({
            name: `${base}-part${i + 1}${ext}`,
            data: url,
        }));
        downloadZip(zipFiles, `${base}.zip`);
        return;
    }

    const link = document.createElement('a');
    link.download = filename;
    link.href = pages[0];
    link.click();
}

export async function captureNetworkRequests(options: NetworkCaptureOptions = {}): Promise<string> {
    const pages = await captureNetworkRequestsPages(options);
    return pages[0] || '';
}

export async function captureNetworkRequestsPages(options: NetworkCaptureOptions = {}): Promise<string[]> {
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
        const dataUrl = await captureTemporaryElement(element, options);
        return [dataUrl];
    }

    const dataUrls: string[] = [];
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
        const url = await captureTemporaryElement(element, options);
        dataUrls.push(url);
    }
    return dataUrls;
}

export async function downloadNetworkRequests(
    filename = 'network-requests.png',
    options: NetworkCaptureOptions = {}
): Promise<void> {
    if (typeof document === 'undefined') {
        throw new Error('[sharedom]: downloadNetworkRequests() requires a browser environment.');
    }
    const pages = await captureNetworkRequestsPages(options);
    const dotIdx = filename.lastIndexOf('.');
    const base = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
    const ext = dotIdx > 0 ? filename.slice(dotIdx) : '.png';

    if (pages.length > 1) {
        const zipFiles = pages.map((url, i) => ({
            name: `${base}-part${i + 1}${ext}`,
            data: url,
        }));
        downloadZip(zipFiles, `${base}.zip`);
        return;
    }

    const link = document.createElement('a');
    link.download = filename;
    link.href = pages[0];
    link.click();
}