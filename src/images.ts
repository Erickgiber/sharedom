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

export async function fetchUrlAsDataUrl(url: string): Promise<string> {
    if (!url || url.startsWith('data:')) {
        return url;
    }

    try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
            const blob = await response.blob();
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(typeof reader.result === 'string' ? reader.result : url);
                };
                reader.onerror = () => {
                    resolve(url);
                };
                reader.readAsDataURL(blob);
            });
        }
    } catch {}

    try {
        const anonymousDataUrl = await new Promise<string>((resolve, reject) => {
            const temp = new Image();
            temp.crossOrigin = 'anonymous';
            temp.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = temp.naturalWidth;
                    canvas.height = temp.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject();
                    ctx.drawImage(temp, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch (e) {
                    reject(e);
                }
            };
            temp.onerror = reject;
            temp.src = url;
        });

        if (anonymousDataUrl && anonymousDataUrl.startsWith('data:')) {
            return anonymousDataUrl;
        }
    } catch {}

    return (await resolveExternally(url)) ?? url;
}

async function fetchImageAsDataUrl(img: HTMLImageElement): Promise<string> {
    const url = img.currentSrc || img.src || img.getAttribute('src') || '';
    if (!url || url.startsWith('data:')) {
        return url;
    }

    const fetched = await fetchUrlAsDataUrl(url);
    if (fetched && fetched.startsWith('data:')) {
        return fetched;
    }

    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                // Throws when the image tainted the canvas, which is the case this fallback exists for.
                return canvas.toDataURL('image/png');
            }
        } catch {}
    }

    return url;
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

export async function inlineImages(rootElement: HTMLElement): Promise<() => void> {
    const images = Array.from(rootElement.querySelectorAll<HTMLImageElement>('img'));
    const originalSources = new Map<HTMLImageElement, { src: string; srcset?: string }>();

    const svgImages = Array.from(rootElement.querySelectorAll<SVGImageElement>('image'));
    const allElements = [rootElement, ...Array.from(rootElement.querySelectorAll<HTMLElement>('*'))];
    const backgroundTargets: { element: HTMLElement; url: string }[] = [];

    for (const element of allElements) {
        const background = element.style.backgroundImage || window.getComputedStyle(element).backgroundImage;
        if (!background || background === 'none') continue;

        const match = background.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/i);
        if (match && match[1]) {
            backgroundTargets.push({ element, url: match[1] });
        }
    }

    await Promise.all([
        runWithConcurrency(images, MAX_CONCURRENT_FETCHES, async (img) => {
            const originalSrc = img.getAttribute('src') || '';
            const originalSrcset = img.getAttribute('srcset') || undefined;
            originalSources.set(img, { src: originalSrc, srcset: originalSrcset });

            const dataUrl = await fetchImageAsDataUrl(img);
            if (dataUrl && dataUrl.startsWith('data:')) {
                img.removeAttribute('srcset');
                img.removeAttribute('sizes');
                img.setAttribute('src', dataUrl);
            }
        }),

        runWithConcurrency(svgImages, MAX_CONCURRENT_FETCHES, async (svgImg) => {
            const href = svgImg.getAttribute('href') || svgImg.getAttribute('xlink:href') || '';
            if (!href || href.startsWith('data:')) return;

            const dataUrl = await fetchUrlAsDataUrl(href);
            if (dataUrl && dataUrl.startsWith('data:')) {
                svgImg.setAttribute('href', dataUrl);
                if (svgImg.hasAttribute('xlink:href')) {
                    svgImg.setAttribute('xlink:href', dataUrl);
                }
            }
        }),

        runWithConcurrency(backgroundTargets, MAX_CONCURRENT_FETCHES, async ({ element, url }) => {
            const dataUrl = await fetchUrlAsDataUrl(url);
            if (dataUrl && dataUrl.startsWith('data:')) {
                element.style.backgroundImage = `url("${dataUrl}")`;
            }
        }),
    ]);

    return () => {
        originalSources.clear();
    };
}
