export type Language = 'en' | 'es';

export interface CaptureOptions {
    scale?: number;
    backgroundColor?: string;
    quality?: number;
    format?: 'png' | 'jpeg' | 'webp';
    width?: number;
    height?: number;
    optimize?: boolean;
    language?: Language;
}

export type DomTarget = string | HTMLElement;
export type DOMTarget = DomTarget;

/** Page size presets available for PDF export. */
export type PdfPageSize = 'auto' | 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Tabloid';

/**
 * Options for PDF export functions.
 * All properties are optional — by default the PDF page matches
 * the exact pixel dimensions of the captured DOM element.
 */
export interface PdfOptions {
    /**
     * Page size preset.
     * - `'auto'` (default): page matches the element dimensions exactly.
     * - Any other value: the image is scaled to fit the selected page size.
     */
    pageSize?: PdfPageSize;

    /**
     * Page orientation. Only applies when `pageSize` is not `'auto'`.
     * @default 'portrait'
     */
    orientation?: 'portrait' | 'landscape';

    /**
     * Margin around the image in points (1pt ≈ 0.353 mm).
     * Applied to all four sides.
     * @default 0
     */
    margin?: number;

    /**
     * Pixel density multiplier used when capturing the DOM element.
     * Higher values produce a sharper image inside the PDF.
     * @default 2
     */
    scale?: number;

    /**
     * Background color applied to the element before capture.
     * Defaults to white (`#ffffff`) because JPEG (used internally) has no alpha channel.
     */
    backgroundColor?: string;

    /**
     * JPEG compression quality for the image embedded in the PDF. Range: 0 – 1.
     * @default 0.92
     */
    quality?: number;

    // ── PDF Metadata ────────────────────────────────────────────────────────

    /** Document title written into the PDF Info dictionary. */
    title?: string;

    /** Author name written into the PDF Info dictionary. */
    author?: string;

    /** Subject / description written into the PDF Info dictionary. */
    subject?: string;

    /** Keywords written into the PDF Info dictionary. */
    keywords?: string | string[];

    language?: Language;
}

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ConsoleLogEntry {
    level: LogLevel;
    message: string;
    timestamp: number;
    count?: number;
}

export interface ConsoleCaptureOptions extends CaptureOptions {
    logs?: ConsoleLogEntry[];
    title?: string;
    maxEntries?: number;
    entriesPerPage?: number;
}

export interface ConsolePdfOptions extends PdfOptions {
    logs?: ConsoleLogEntry[];
    title?: string;
    maxEntries?: number;
    entriesPerPage?: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | string;

export interface NetworkRequestEntry {
    method: HttpMethod;
    url: string;
    name: string;
    status: number | string;
    statusText?: string;
    type?: string;
    duration?: number;
    timestamp: number;
}

export interface NetworkCaptureOptions extends CaptureOptions {
    requests?: NetworkRequestEntry[];
    title?: string;
    maxEntries?: number;
    entriesPerPage?: number;
}

export interface NetworkPdfOptions extends PdfOptions {
    requests?: NetworkRequestEntry[];
    title?: string;
    maxEntries?: number;
    entriesPerPage?: number;
}

export interface ZipFileInput {
    name: string;
    data: Uint8Array | ArrayBuffer | string;
}

