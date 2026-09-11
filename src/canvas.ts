import { CaptureOptions } from './types';
import { exportOptimizedCanvas } from './optimizer';

/**
 * Browsers silently produce a blank canvas past these limits, which used to surface as an empty
 * data URL. The scale is reduced instead so a large element still yields a usable image.
 */
const MAX_CANVAS_SIDE = 32767;
const MAX_CANVAS_AREA = 268_435_456;

function fitToCanvasLimits(width: number, height: number, scale: number): number {
    const maxBySide = Math.min(MAX_CANVAS_SIDE / width, MAX_CANVAS_SIDE / height);
    const maxByArea = Math.sqrt(MAX_CANVAS_AREA / (width * height));
    const limit = Math.min(maxBySide, maxByArea);
    return scale <= limit ? scale : limit;
}

export function renderSvgToCanvas(
    svgDataUrl: string,
    width: number,
    height: number,
    options: CaptureOptions
): Promise<string> {
    const { scale = 1, backgroundColor, quality = 0.92, format = 'png', optimize = true } = options;
    const effectiveScale = fitToCanvasLimits(width, height, scale);

    if (effectiveScale < scale) {
        console.warn(
            `[sharedom]: ${width}x${height}px at ${scale}x exceeds this browser's canvas limits. ` +
                `Rendering at ${effectiveScale.toFixed(2)}x instead.`
        );
    }

    return new Promise<string>((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width * effectiveScale);
            canvas.height = Math.round(height * effectiveScale);

            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) {
                return reject(new Error('[sharedom]: Could not obtain 2D canvas context.'));
            }

            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.scale(effectiveScale, effectiveScale);

            if (backgroundColor) {
                context.fillStyle = backgroundColor;
                context.fillRect(0, 0, width, height);
            }

            context.drawImage(image, 0, 0);

            try {
                const mimeType =
                    format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
                const dataUrl = optimize
                    ? exportOptimizedCanvas(canvas, context, format, quality)
                    : canvas.toDataURL(mimeType, quality);

                // A canvas the browser refused to rasterize exports as the empty "data:," URL.
                if (!dataUrl.startsWith('data:image/')) {
                    return reject(
                        new Error(
                            `[sharedom]: The browser could not rasterize ${canvas.width}x${canvas.height}px. ` +
                                'Capture a smaller element or lower the scale option.'
                        )
                    );
                }

                resolve(dataUrl);
            } catch (error) {
                reject(new Error(`[sharedom]: Failed to export canvas image. ${error}`));
            }
        };

        image.onerror = (error) => {
            reject(new Error(`[sharedom]: Failed to load rendered SVG image. ${error}`));
        };

        image.src = svgDataUrl;
    });
}
