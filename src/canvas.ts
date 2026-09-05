import { CaptureOptions } from './types';
import { exportOptimizedCanvas } from './optimizer';

export function renderSvgToCanvas(
    svgDataUrl: string,
    width: number,
    height: number,
    options: CaptureOptions
): Promise<string> {
    const { scale = 1, backgroundColor, quality = 0.92, format = 'png', optimize = true } = options;

    return new Promise<string>((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);

            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) {
                return reject(new Error('[sharedom]: Could not obtain 2D canvas context.'));
            }

            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.scale(scale, scale);

            if (backgroundColor) {
                context.fillStyle = backgroundColor;
                context.fillRect(0, 0, width, height);
            }

            context.drawImage(image, 0, 0);

            try {
                if (optimize) {
                    const dataUrl = exportOptimizedCanvas(canvas, context, format, quality);
                    resolve(dataUrl);
                } else {
                    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
                    const dataUrl = canvas.toDataURL(mimeType, quality);
                    resolve(dataUrl);
                }
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
