import { CaptureOptions } from './types';
import { exportOptimizedCanvas } from './optimizer';

/**
 * Browsers silently produce a blank canvas past these limits, which used to surface as an empty
 * data URL. The scale is reduced instead so a large element still yields a usable image.
 */
const MAX_CANVAS_SIDE = 32767;
const MAX_CANVAS_AREA = 268_435_456;

export interface CanvasSize {
    width: number;
    height: number;
}

export function fitCanvasSize(width: number, height: number, scale: number): CanvasSize {
    const maxBySide = Math.min(MAX_CANVAS_SIDE / width, MAX_CANVAS_SIDE / height);
    const maxByArea = Math.sqrt(MAX_CANVAS_AREA / (width * height));
    const effectiveScale = Math.min(scale, maxBySide, maxByArea);

    if (effectiveScale < scale) {
        console.warn(
            `[sharedom]: ${width}x${height}px at ${scale}x exceeds this browser's canvas limits. ` +
                `Rendering at ${effectiveScale.toFixed(2)}x instead.`
        );
    }

    return {
        width: Math.max(1, Math.round(width * effectiveScale)),
        height: Math.max(1, Math.round(height * effectiveScale)),
    };
}

/** Draws an SVG whose intrinsic size already is `size`, so no bitmap scaling happens here. */
export async function renderSvgToCanvas(
    svgDataUrl: string,
    size: CanvasSize,
    options: CaptureOptions
): Promise<string> {
    const { backgroundColor, quality = 0.92, format = 'png', optimize = true } = options;

    const image = new Image();
    image.src = svgDataUrl;
    try {
        // Unlike onload, decode() resolves only once the image, embedded fonts included, is ready to paint.
        await image.decode();
    } catch (error) {
        throw new Error('[sharedom]: The browser could not render the captured markup as an image.', {
            cause: error,
        });
    }

    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
        throw new Error('[sharedom]: Could not obtain 2D canvas context.');
    }

    if (backgroundColor) {
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, size.width, size.height);
    }

    context.drawImage(image, 0, 0, size.width, size.height);

    let dataUrl: string;
    try {
        const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        dataUrl = optimize
            ? exportOptimizedCanvas(canvas, context, format, quality)
            : canvas.toDataURL(mimeType, quality);
    } catch (error) {
        throw new Error(`[sharedom]: Failed to export canvas image. ${error}`, { cause: error });
    }

    // A canvas the browser refused to rasterize exports as the empty "data:," URL.
    if (!dataUrl.startsWith('data:image/')) {
        throw new Error(
            `[sharedom]: The browser could not rasterize ${canvas.width}x${canvas.height}px. ` +
                'Capture a smaller element or lower the scale option.'
        );
    }

    return dataUrl;
}
