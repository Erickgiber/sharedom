/**
 * Last resort for images the page itself is not allowed to read (CORS without
 * Access-Control-Allow-Origin). A host with elevated privileges — a browser extension, a proxy —
 * can install a resolver that returns the image as a data URL.
 */
export type ImageResolver = (url: string) => Promise<string | null>;

let externalResolver: ImageResolver | null = null;

export function setImageResolver(resolver: ImageResolver | null): void {
    externalResolver = resolver;
}

async function resolveExternally(url: string): Promise<string | null> {
    if (!externalResolver) return null;
    try {
        const resolved = await externalResolver(url);
        return resolved && resolved.startsWith('data:') ? resolved : null;
    } catch {
        return null;
    }
}

function readBlobAsDataUrl(blob: Blob): Promise<string | null> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
    });
}

/** Resolves to null when the page may not read the resource (network failure or CORS). */
export async function fetchAsDataUrl(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { mode: 'cors' });
        return response.ok ? await readBlobAsDataUrl(await response.blob()) : null;
    } catch {
        return null;
    }
}

function rasterizeDecodedImage(image: HTMLImageElement): string | null {
    if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) return null;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) return null;
        context.drawImage(image, 0, 0);
        // Throws when the image tainted the canvas, which is exactly the case being probed.
        return canvas.toDataURL('image/png');
    } catch {
        return null;
    }
}

async function loadAnonymousImage(url: string): Promise<string | null> {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = url;
    try {
        await image.decode();
    } catch {
        return null;
    }
    return rasterizeDecodedImage(image);
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
    return (await fetchAsDataUrl(url)) ?? (await loadAnonymousImage(url)) ?? (await resolveExternally(url));
}

/** Image heavy pages would otherwise open hundreds of parallel requests and stall the tab. */
const MAX_CONCURRENT_FETCHES = 6;

async function runWithConcurrency<T>(
    items: T[],
    limit: number,
    task: (item: T) => Promise<void>
): Promise<void> {
    let cursor = 0;

    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const item = items[cursor];
            cursor++;
            await task(item);
        }
    });

    await Promise.all(workers);
}

const CSS_URL = /url\((["']?)(.*?)\1\)/g;

function isRemoteUrl(url: string): boolean {
    return url !== '' && !url.startsWith('data:') && !url.startsWith('#') && !url.startsWith('about:');
}

function urlsInCss(css: string): string[] {
    return Array.from(css.matchAll(CSS_URL), (match) => match[2]).filter(isRemoteUrl);
}

function replaceUrlsInCss(css: string, resolved: ReadonlyMap<string, string | null>): string {
    return css.replace(CSS_URL, (whole, _quote: string, url: string) => {
        const dataUrl = resolved.get(url);
        return dataUrl ? `url("${dataUrl}")` : whole;
    });
}

export interface InlinableContent {
    root: HTMLElement;
    /** Clone → source, the source being the image the page already decoded. */
    images: ReadonlyMap<HTMLImageElement, HTMLImageElement>;
    css: string;
}

/**
 * An SVG image may not load anything, so every image the clone shows (<img>, SVG <image>, and
 * url() values in inline styles and pseudo-element rules) is replaced by a data URL. Returns `css`
 * with its URLs inlined as well.
 */
export async function inlineImages({ root, images, css }: InlinableContent): Promise<string> {
    const elements = [root, ...Array.from(root.querySelectorAll('*'))];
    const styled = elements.filter(
        (element): element is HTMLElement | SVGElement =>
            (element instanceof HTMLElement || element instanceof SVGElement) &&
            (element.getAttribute('style') ?? '').includes('url(')
    );
    const svgImages = elements.filter(
        (element): element is SVGImageElement => element instanceof SVGImageElement
    );

    const urls = new Set<string>(urlsInCss(css));
    for (const image of images.keys()) urls.add(image.getAttribute('src') ?? '');
    for (const image of svgImages) urls.add(image.getAttribute('href') ?? '');
    for (const element of styled) {
        for (const url of urlsInCss(element.getAttribute('style') ?? '')) urls.add(url);
    }

    const resolved = new Map<string, string | null>();
    await runWithConcurrency(Array.from(urls).filter(isRemoteUrl), MAX_CONCURRENT_FETCHES, async (url) => {
        resolved.set(url, await imageUrlToDataUrl(url));
    });

    for (const [clone, source] of images) {
        const src = clone.getAttribute('src') ?? '';
        const dataUrl = resolved.get(src) ?? (isRemoteUrl(src) ? rasterizeDecodedImage(source) : null);
        if (dataUrl) clone.setAttribute('src', dataUrl);
    }

    for (const image of svgImages) {
        const dataUrl = resolved.get(image.getAttribute('href') ?? '');
        if (dataUrl) image.setAttribute('href', dataUrl);
    }

    for (const element of styled) {
        for (let i = 0; i < element.style.length; i++) {
            const name = element.style[i];
            const value = element.style.getPropertyValue(name);
            if (value.includes('url(')) element.style.setProperty(name, replaceUrlsInCss(value, resolved));
        }
    }

    return replaceUrlsInCss(css, resolved);
}
