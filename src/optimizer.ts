/** Reading a whole large canvas at once allocates width x height x 4 bytes, so it is read in bands. */
const MAX_BAND_PIXELS = 2_000_000;

export function optimizeCanvasPixels(context: CanvasRenderingContext2D, width: number, height: number): void {
    if (width <= 0 || height <= 0) return;

    const bandHeight = Math.max(1, Math.min(height, Math.floor(MAX_BAND_PIXELS / width)));

    for (let top = 0; top < height; top += bandHeight) {
        const rows = Math.min(bandHeight, height - top);

        let imageData: ImageData;
        try {
            imageData = context.getImageData(0, top, width, rows);
        } catch {
            return;
        }

        const pixelView = new Uint32Array(imageData.data.buffer);
        let hasModifications = false;

        for (let i = 0; i < pixelView.length; i++) {
            if ((pixelView[i] & 0xff000000) === 0 && pixelView[i] !== 0) {
                pixelView[i] = 0;
                hasModifications = true;
            }
        }

        if (hasModifications) {
            context.putImageData(imageData, 0, top);
        }
    }
}

export function optimizeDataUrl(dataUrl: string): string {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) {
        return dataUrl;
    }

    const header = dataUrl.slice(0, commaIndex);
    const base64Payload = dataUrl.slice(commaIndex + 1).trim();

    return `${header},${base64Payload}`;
}

export function exportOptimizedCanvas(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality = 0.92
): string {
    optimizeCanvasPixels(context, canvas.width, canvas.height);

    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const rawDataUrl = canvas.toDataURL(mimeType, quality);

    return optimizeDataUrl(rawDataUrl);
}
