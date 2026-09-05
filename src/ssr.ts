import { buildPdf, PdfBuildOptions } from './pdf-writer';
import { PdfPageSize } from './types';

export { buildPdf };
export type { PdfBuildOptions, PdfPageSize };

export interface SsrViewport {
    width: number;
    height: number;
}

export interface SsrCaptureOptions {
    scale?: number;
    viewport?: SsrViewport;
    format?: 'svg' | 'png' | 'jpeg' | 'webp';
    quality?: number;
    backgroundColor?: string;
    delay?: number;
    fullPage?: boolean;
    headers?: Record<string, string>;
    /** Optional CSS stylesheet to inject into the rendered SVG foreignObject. */
    styles?: string;
}

export interface SsrPdfOptions extends Omit<PdfBuildOptions, 'imageWidthPx' | 'imageHeightPx'> {
    /** Override image pixel width if not auto-detected from JPEG. */
    imageWidthPx?: number;
    /** Override image pixel height if not auto-detected from JPEG. */
    imageHeightPx?: number;
}

/**
 * Encodes a Uint8Array to a Base64 string in both Node.js and browser environments.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
    const NodeBuffer = typeof globalThis !== 'undefined' ? (globalThis as any).Buffer : undefined;
    if (NodeBuffer && typeof NodeBuffer.from === 'function') {
        return NodeBuffer.from(bytes).toString('base64');
    }
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Converts a Base64 string or Data URL into a Uint8Array in both Node.js and browser environments.
 */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
    const commaIdx = dataUrl.indexOf(',');
    const base64 = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    const NodeBuffer = typeof globalThis !== 'undefined' ? (globalThis as any).Buffer : undefined;
    if (NodeBuffer && typeof NodeBuffer.from === 'function') {
        const buf = NodeBuffer.from(base64, 'base64');
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
}

/**
 * Reads image dimensions (width, height) directly from JPEG bytes without any external dependencies.
 * Parses SOF (Start of Frame) markers according to ISO/IEC 10918-1.
 */
export function getJpegDimensions(bytes: Uint8Array): { width: number; height: number } {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
        throw new Error('[sharedom/ssr]: Invalid JPEG header (missing SOI 0xFFD8).');
    }

    let offset = 2;
    while (offset < bytes.length) {
        if (bytes[offset] !== 0xff) {
            offset++;
            continue;
        }

        const marker = bytes[offset + 1];
        offset += 2;

        // SOF markers (Start of Frame, baseline, progressive, extended sequential, etc.)
        const isSof =
            marker >= 0xc0 &&
            marker <= 0xcf &&
            marker !== 0xc4 && // DHT (Huffman table)
            marker !== 0xc8 && // JPG reserved
            marker !== 0xcc;   // DAC (Arithmetic conditioning)

        if (isSof) {
            // Segment format: Length (2 bytes), Precision (1 byte), Height (2 bytes), Width (2 bytes)
            if (offset + 7 <= bytes.length) {
                const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
                const width  = (bytes[offset + 5] << 8) | bytes[offset + 6];
                return { width, height };
            }
            break;
        }

        // Variable-length marker: read length and skip to next segment
        if (offset + 2 <= bytes.length) {
            const length = (bytes[offset] << 8) | bytes[offset + 1];
            offset += length;
        } else {
            break;
        }
    }

    throw new Error('[sharedom/ssr]: Could not extract dimensions from JPEG bytes.');
}

/**
 * Server-side DOM capture function for Node.js, Next.js, and SvelteKit.
 * Wraps HTML or URL into a scalable SVG foreignObject document with optional custom styles.
 *
 * @param htmlOrUrl  HTML markup string or website URL.
 * @param options    SSR capture configuration (viewport, background, delay, styles).
 * @returns          A Uint8Array of the encoded SVG markup.
 *
 * @example
 * // Next.js App Router Route Handler:
 * const buffer = await captureSSR('<div class="card">Hello SSR</div>', {
 *   viewport: { width: 1200, height: 630 },
 *   styles: '.card { font-size: 24px; padding: 20px; }'
 * });
 */
export async function captureSSR(
    htmlOrUrl: string,
    options: SsrCaptureOptions = {}
): Promise<Uint8Array> {
    const {
        viewport = { width: 1200, height: 630 },
        backgroundColor = '#ffffff',
        delay = 0,
        styles = '',
    } = options;

    if (!htmlOrUrl || typeof htmlOrUrl !== 'string') {
        throw new Error('[sharedom/ssr]: htmlOrUrl must be a non-empty string.');
    }

    if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const svgWidth = viewport.width;
    const svgHeight = viewport.height;
    const isUrl = /^https?:\/\//i.test(htmlOrUrl.trim());

    const contentHtml = isUrl
        ? `<iframe src="${htmlOrUrl}" style="width:100%;height:100%;border:none;"></iframe>`
        : htmlOrUrl;

    const styleTag = styles ? `<style>${styles}</style>` : '';

    const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
      ${styleTag}
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:${backgroundColor};margin:0;padding:0;box-sizing:border-box;">
          ${contentHtml}
        </div>
      </foreignObject>
    </svg>
  `.trim();

    const encoder = new TextEncoder();
    return encoder.encode(svgString);
}

/**
 * Creates an SSR snapshot and returns it as a Base64 Data URL.
 *
 * @param htmlOrUrl  HTML markup string or website URL.
 * @param options    SSR capture options.
 * @returns          A Base64 Data URL string (`data:image/svg+xml;base64,...`).
 */
export async function createSsrSnapshot(
    htmlOrUrl: string,
    options: SsrCaptureOptions = {}
): Promise<string> {
    const buffer = await captureSSR(htmlOrUrl, options);
    const base64 = uint8ArrayToBase64(buffer);
    const format = options.format || 'svg';
    const mime =
        format === 'svg'
            ? 'image/svg+xml'
            : format === 'jpeg'
            ? 'image/jpeg'
            : format === 'webp'
            ? 'image/webp'
            : 'image/png';
    return `data:${mime};base64,${base64}`;
}

/**
 * Generates a valid PDF 1.4 binary directly on the server from raw JPEG bytes or a Base64 Data URL.
 * Requires ZERO native dependencies, zero canvas binaries, and runs with sub-millisecond latency.
 *
 * @param image    Raw JPEG Uint8Array or a Base64 Data URL (`data:image/jpeg;base64,...`).
 * @param options  PDF build options (pageSize, orientation, margins, metadata, dpi).
 * @returns        A Uint8Array representing the PDF document.
 *
 * @example
 * // Next.js Route Handler:
 * import { createPdfFromImageSSR } from 'sharedom/ssr';
 *
 * export async function POST(req: Request) {
 *   const { imageDataUrl, title } = await req.json();
 *   const pdfBytes = createPdfFromImageSSR(imageDataUrl, {
 *     pageSize: 'A4',
 *     title,
 *   });
 *   return new Response(pdfBytes, {
 *     headers: { 'Content-Type': 'application/pdf' }
 *   });
 * }
 */
export function createPdfFromImageSSR(
    image: Uint8Array | string,
    options: SsrPdfOptions = {}
): Uint8Array {
    const bytes = typeof image === 'string' ? dataUrlToBytes(image) : image;

    let widthPx = options.imageWidthPx;
    let heightPx = options.imageHeightPx;

    if (!widthPx || !heightPx) {
        try {
            const dims = getJpegDimensions(bytes);
            widthPx = widthPx ?? dims.width;
            heightPx = heightPx ?? dims.height;
        } catch {
            widthPx = widthPx ?? 1200;
            heightPx = heightPx ?? 630;
        }
    }

    return buildPdf(bytes, {
        ...options,
        imageWidthPx: widthPx,
        imageHeightPx: heightPx,
    });
}
