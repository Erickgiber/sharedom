export function optimizeCanvasPixels(context: CanvasRenderingContext2D, width: number, height: number): void {
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    const pixelView = new Uint32Array(data.buffer);
    const length = pixelView.length;

    let hasModifications = false;

    for (let i = 0; i < length; i++) {
        if ((pixelView[i] & 0xff000000) === 0 && pixelView[i] !== 0) {
            pixelView[i] = 0;
            hasModifications = true;
        }
    }

    if (hasModifications) {
        context.putImageData(imageData, 0, 0);
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
