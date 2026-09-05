import { PdfPageSize } from './types';

const PAGE_PRESETS: Record<Exclude<PdfPageSize, 'auto'>, { width: number; height: number }> = {
    A4:      { width: 595.28,  height: 841.89  },
    A3:      { width: 841.89,  height: 1190.55 },
    A5:      { width: 419.53,  height: 595.28  },
    Letter:  { width: 612,     height: 792     },
    Legal:   { width: 612,     height: 1008    },
    Tabloid: { width: 792,     height: 1224    },
};

const _encoder = new TextEncoder();

function str(s: string): Uint8Array {
    return _encoder.encode(s);
}

function concat(...parts: Uint8Array[]): Uint8Array {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

function pad10(n: number): string {
    return String(Math.round(n)).padStart(10, '0');
}

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

function pdfDate(d: Date): string {
    return (
        `D:${d.getFullYear()}` +
        `${pad2(d.getMonth() + 1)}` +
        `${pad2(d.getDate())}` +
        `${pad2(d.getHours())}` +
        `${pad2(d.getMinutes())}` +
        `${pad2(d.getSeconds())}`
    );
}

/**
 * Encodes a text string for PDF metadata dictionary.
 * Standard ASCII strings are enclosed in ( ... ) with characters escaped.
 * Strings containing non-ASCII characters (e.g. Spanish accents, ñ, emojis)
 * are encoded as UTF-16BE hexadecimal strings with Byte Order Mark <FEFF...>,
 * guaranteeing correct rendering in all PDF readers without corruption.
 */
function encodePdfString(s: string): string {
    const isPureAscii = /^[\x20-\x7E]*$/.test(s);
    if (isPureAscii) {
        return `(${s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')})`;
    }
    let hex = 'FEFF';
    for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        hex += code.toString(16).padStart(4, '0').toUpperCase();
    }
    return `<${hex}>`;
}

function num(n: number, decimals = 3): string {
    return n.toFixed(decimals);
}

export interface PdfBuildOptions {
    /** Actual pixel width of the JPEG image. */
    imageWidthPx: number;
    /** Actual pixel height of the JPEG image. */
    imageHeightPx: number;
    /**
     * Screen DPI used when capturing the image.
     * Pass `96 * scale` (e.g. 192 for scale=2) so the element renders at its natural CSS size.
     * @default 96
     */
    dpi?: number;
    pageSize?: PdfPageSize;
    orientation?: 'portrait' | 'landscape';
    /** Margin in points applied to all four sides. @default 0 */
    margin?: number;
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string | string[];
}

/**
 * Builds a minimal, valid PDF 1.4 binary from raw JPEG bytes.
 * Zero external dependencies — pure TypeScript / Web API only.
 */
export function buildPdf(jpegBytes: Uint8Array, opts: PdfBuildOptions): Uint8Array {
    const {
        imageWidthPx,
        imageHeightPx,
        dpi = 96,
        pageSize = 'auto',
        orientation = 'portrait',
        margin = 0,
        title = '',
        author = '',
        subject = '',
        keywords,
    } = opts;

    const pxToPt = 72 / dpi;
    const imgWidthPt  = imageWidthPx  * pxToPt;
    const imgHeightPt = imageHeightPx * pxToPt;

    let pageWidthPt: number;
    let pageHeightPt: number;

    if (pageSize === 'auto') {
        pageWidthPt  = imgWidthPt  + margin * 2;
        pageHeightPt = imgHeightPt + margin * 2;
    } else {
        let preset = { ...PAGE_PRESETS[pageSize] };
        if (orientation === 'landscape' && preset.width < preset.height) {
            preset = { width: preset.height, height: preset.width };
        } else if (orientation === 'portrait' && preset.width > preset.height) {
            preset = { width: preset.height, height: preset.width };
        }
        pageWidthPt  = preset.width;
        pageHeightPt = preset.height;
    }

    const availableWidth  = pageWidthPt  - margin * 2;
    const availableHeight = pageHeightPt - margin * 2;

    let drawWidthPt  = imgWidthPt;
    let drawHeightPt = imgHeightPt;

    if (pageSize !== 'auto') {
        const scaleX = availableWidth  / imgWidthPt;
        const scaleY = availableHeight / imgHeightPt;
        const fitScale = Math.min(scaleX, scaleY, 1);
        drawWidthPt  = imgWidthPt  * fitScale;
        drawHeightPt = imgHeightPt * fitScale;
    }

    const xOff = margin + (availableWidth  - drawWidthPt)  / 2;
    const yOff = margin + (availableHeight - drawHeightPt) / 2;

    const now = new Date();
    const dateStr = pdfDate(now);
    const creator  = 'sharedom';
    const producer = 'sharedom (https://github.com/Erickgiber/sharedom)';

    const offsets: number[] = new Array(7).fill(0);
    const parts: Uint8Array[] = [];

    const header = str('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    parts.push(header);
    let pos = header.length;

    function addObject(id: number, body: string): void {
        offsets[id] = pos;
        const chunk = str(`${id} 0 obj\n${body}\nendobj\n`);
        parts.push(chunk);
        pos += chunk.length;
    }

    addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
    addObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');

    const mediaBox = `[0 0 ${num(pageWidthPt)} ${num(pageHeightPt)}]`;
    addObject(3,
        `<< /Type /Page /Parent 2 0 R /MediaBox ${mediaBox} ` +
        `/Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>`
    );

    const contentInner =
        `${num(drawWidthPt)} 0 0 ${num(drawHeightPt)} ${num(xOff)} ${num(yOff)} cm /Img Do`;
    const contentBody = `q\n${contentInner}\nQ`;
    addObject(4,
        `<< /Length ${contentBody.length} >>\nstream\n${contentBody}\nendstream`
    );

    {
        offsets[5] = pos;
        const imgDictAndStream = str(
            `5 0 obj\n` +
            `<< /Type /XObject /Subtype /Image ` +
            `/Width ${imageWidthPx} /Height ${imageHeightPx} ` +
            `/ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
            `/Filter /DCTDecode /Length ${jpegBytes.length} >>\n` +
            `stream\n`
        );
        const imgFooter = str(`\nendstream\nendobj\n`);
        const imageObj = concat(imgDictAndStream, jpegBytes, imgFooter);
        parts.push(imageObj);
        pos += imageObj.length;
    }

    const hasMetadata = Boolean(title || author || subject || (keywords && (Array.isArray(keywords) ? keywords.length > 0 : Boolean(keywords))));

    let infoObjId: number | null = null;
    if (hasMetadata) {
        infoObjId = 6;
        const entries: string[] = [];
        if (title)   entries.push(`/Title ${encodePdfString(title)}`);
        if (author)  entries.push(`/Author ${encodePdfString(author)}`);
        if (subject) entries.push(`/Subject ${encodePdfString(subject)}`);
        if (keywords) {
            const kwStr = Array.isArray(keywords) ? keywords.join(', ') : keywords;
            if (kwStr) entries.push(`/Keywords ${encodePdfString(kwStr)}`);
        }
        entries.push(`/Creator (sharedom)`);
        entries.push(`/Producer (sharedom)`);
        entries.push(`/CreationDate (${dateStr})`);
        entries.push(`/ModDate (${dateStr})`);
        addObject(infoObjId, `<<\n  ${entries.join('\n  ')}\n>>`);
    }

    const xrefOffset = pos;
    const objCount = infoObjId ? 7 : 6;
    let xref = `xref\n0 ${objCount}\n`;
    xref += '0000000000 65535 f \n';
    for (let i = 1; i < objCount; i++) {
        xref += `${pad10(offsets[i])} 00000 n \n`;
    }
    const trailerInfo = infoObjId ? ` /Info ${infoObjId} 0 R` : '';
    xref +=
        `trailer\n<< /Size ${objCount} /Root 1 0 R${trailerInfo} >>\n` +
        `startxref\n${xrefOffset}\n%%EOF\n`;

    parts.push(str(xref));

    return concat(...parts);
}

export interface MultiPagePdfBuildOptions extends Omit<PdfBuildOptions, 'jpegBytes' | 'imageWidthPx' | 'imageHeightPx'> {
    pages: {
        jpegBytes: Uint8Array;
        imageWidthPx: number;
        imageHeightPx: number;
    }[];
}

export function buildMultiPagePdf(opts: MultiPagePdfBuildOptions): Uint8Array {
    const {
        pages,
        dpi = 96,
        pageSize = 'auto',
        orientation = 'portrait',
        margin = 0,
        title = '',
        author = '',
        subject = '',
        keywords,
    } = opts;

    if (!pages || pages.length === 0) {
        return buildPdf(new Uint8Array(), {
            imageWidthPx: 100,
            imageHeightPx: 100,
            ...opts,
        });
    }

    if (pages.length === 1) {
        return buildPdf(pages[0].jpegBytes, {
            imageWidthPx: pages[0].imageWidthPx,
            imageHeightPx: pages[0].imageHeightPx,
            ...opts,
        });
    }

    const pxToPt = 72 / dpi;
    const now = new Date();
    const dateStr = pdfDate(now);

    const hasMetadata = Boolean(title || author || subject || (keywords && (Array.isArray(keywords) ? keywords.length > 0 : Boolean(keywords))));
    const infoObjId = hasMetadata ? 3 + pages.length * 3 : null;
    const totalObjects = infoObjId ? infoObjId + 1 : 3 + pages.length * 3;

    const offsets: number[] = new Array(totalObjects).fill(0);
    const parts: Uint8Array[] = [];

    const header = str('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    parts.push(header);
    let pos = header.length;

    function addObject(id: number, body: string): void {
        offsets[id] = pos;
        const chunk = str(`${id} 0 obj\n${body}\nendobj\n`);
        parts.push(chunk);
        pos += chunk.length;
    }

    addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');

    const kidsArray: string[] = [];
    for (let i = 0; i < pages.length; i++) {
        const pageId = 3 + i * 3;
        kidsArray.push(`${pageId} 0 R`);
    }
    addObject(2, `<< /Type /Pages /Kids [${kidsArray.join(' ')}] /Count ${pages.length} >>`);

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageId = 3 + i * 3;
        const contentId = 4 + i * 3;
        const imgId = 5 + i * 3;

        const imgWidthPt = page.imageWidthPx * pxToPt;
        const imgHeightPt = page.imageHeightPx * pxToPt;

        let pageWidthPt: number;
        let pageHeightPt: number;

        if (pageSize === 'auto') {
            pageWidthPt = imgWidthPt + margin * 2;
            pageHeightPt = imgHeightPt + margin * 2;
        } else {
            let preset = { ...PAGE_PRESETS[pageSize] };
            if (orientation === 'landscape' && preset.width < preset.height) {
                preset = { width: preset.height, height: preset.width };
            } else if (orientation === 'portrait' && preset.width > preset.height) {
                preset = { width: preset.height, height: preset.width };
            }
            pageWidthPt = preset.width;
            pageHeightPt = preset.height;
        }

        const availableWidth = pageWidthPt - margin * 2;
        const availableHeight = pageHeightPt - margin * 2;

        let drawWidthPt = imgWidthPt;
        let drawHeightPt = imgHeightPt;

        if (pageSize !== 'auto') {
            const scaleX = availableWidth / imgWidthPt;
            const scaleY = availableHeight / imgHeightPt;
            const fitScale = Math.min(scaleX, scaleY, 1);
            drawWidthPt = imgWidthPt * fitScale;
            drawHeightPt = imgHeightPt * fitScale;
        }

        const xOff = margin + (availableWidth - drawWidthPt) / 2;
        const yOff = margin + (availableHeight - drawHeightPt) / 2;

        const mediaBox = `[0 0 ${num(pageWidthPt)} ${num(pageHeightPt)}]`;
        addObject(pageId,
            `<< /Type /Page /Parent 2 0 R /MediaBox ${mediaBox} ` +
            `/Contents ${contentId} 0 R /Resources << /XObject << /Img ${imgId} 0 R >> >> >>`
        );

        const contentInner =
            `${num(drawWidthPt)} 0 0 ${num(drawHeightPt)} ${num(xOff)} ${num(yOff)} cm /Img Do`;
        const contentBody = `q\n${contentInner}\nQ`;
        addObject(contentId,
            `<< /Length ${contentBody.length} >>\nstream\n${contentBody}\nendstream`
        );

        offsets[imgId] = pos;
        const imgDictAndStream = str(
            `${imgId} 0 obj\n` +
            `<< /Type /XObject /Subtype /Image ` +
            `/Width ${page.imageWidthPx} /Height ${page.imageHeightPx} ` +
            `/ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
            `/Filter /DCTDecode /Length ${page.jpegBytes.length} >>\n` +
            `stream\n`
        );
        const imgFooter = str(`\nendstream\nendobj\n`);
        const imageObj = concat(imgDictAndStream, page.jpegBytes, imgFooter);
        parts.push(imageObj);
        pos += imageObj.length;
    }

    if (hasMetadata && infoObjId) {
        const entries: string[] = [];
        if (title) entries.push(`/Title ${encodePdfString(title)}`);
        if (author) entries.push(`/Author ${encodePdfString(author)}`);
        if (subject) entries.push(`/Subject ${encodePdfString(subject)}`);
        if (keywords) {
            const kwStr = Array.isArray(keywords) ? keywords.join(', ') : keywords;
            if (kwStr) entries.push(`/Keywords ${encodePdfString(kwStr)}`);
        }
        entries.push(`/Creator (sharedom)`);
        entries.push(`/Producer (sharedom)`);
        entries.push(`/CreationDate (${dateStr})`);
        entries.push(`/ModDate (${dateStr})`);
        addObject(infoObjId, `<<\n  ${entries.join('\n  ')}\n>>`);
    }

    const xrefOffset = pos;
    let xref = `xref\n0 ${totalObjects}\n`;
    xref += '0000000000 65535 f \n';
    for (let i = 1; i < totalObjects; i++) {
        xref += `${pad10(offsets[i])} 00000 n \n`;
    }
    const trailerInfo = infoObjId ? ` /Info ${infoObjId} 0 R` : '';
    xref +=
        `trailer\n<< /Size ${totalObjects} /Root 1 0 R${trailerInfo} >>\n` +
        `startxref\n${xrefOffset}\n%%EOF\n`;

    parts.push(str(xref));

    return concat(...parts);
}
