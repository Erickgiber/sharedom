/**
 * Canvas and video content lives in a bitmap that no DOM clone carries, so both are snapshotted
 * into a plain image before the element tree is serialized into the SVG.
 */
const MAX_SNAPSHOT_PIXELS = 4096 * 4096;

function isCanvas(element: Element): element is HTMLCanvasElement {
    return typeof HTMLCanvasElement !== 'undefined' && element instanceof HTMLCanvasElement;
}

function isVideo(element: Element): element is HTMLVideoElement {
    return typeof HTMLVideoElement !== 'undefined' && element instanceof HTMLVideoElement;
}

function buildReplacement(dataUrl: string, source: HTMLElement, objectFit: string): HTMLImageElement {
    const image = document.createElement('img');
    image.src = dataUrl;
    image.alt = '';
    image.style.objectFit = objectFit;

    const rect = source.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
        image.style.width = `${rect.width}px`;
        image.style.height = `${rect.height}px`;
    }

    return image;
}

function snapshotCanvas(canvas: HTMLCanvasElement): HTMLImageElement | null {
    const { width, height } = canvas;
    if (width === 0 || height === 0 || width * height > MAX_SNAPSHOT_PIXELS) return null;

    try {
        const dataUrl = canvas.toDataURL('image/png');
        // A tainted canvas throws; a WebGL context without preserveDrawingBuffer returns a blank frame.
        return dataUrl.startsWith('data:image/') ? buildReplacement(dataUrl, canvas, 'fill') : null;
    } catch {
        return null;
    }
}

function snapshotVideo(video: HTMLVideoElement): HTMLImageElement | null {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height || width * height > MAX_SNAPSHOT_PIXELS) return null;

    try {
        const frame = document.createElement('canvas');
        frame.width = width;
        frame.height = height;

        const context = frame.getContext('2d');
        if (!context) return null;

        context.drawImage(video, 0, 0, width, height);
        const objectFit = window.getComputedStyle(video).objectFit || 'contain';
        return buildReplacement(frame.toDataURL('image/png'), video, objectFit);
    } catch {
        return null;
    }
}

/** Returns an image that reproduces the element's current frame, or null when it cannot be read. */
export function snapshotMediaElement(source: Element): HTMLImageElement | null {
    if (typeof document === 'undefined') return null;
    if (isCanvas(source)) return snapshotCanvas(source);
    if (isVideo(source)) return snapshotVideo(source);
    return null;
}
