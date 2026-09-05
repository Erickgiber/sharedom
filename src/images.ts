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

    return url;
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
                return canvas.toDataURL('image/png');
            }
        } catch {}
    }

    return url;
}

export async function inlineImages(rootElement: HTMLElement): Promise<() => void> {
    const images = Array.from(rootElement.querySelectorAll<HTMLImageElement>('img'));
    const originalSources = new Map<HTMLImageElement, { src: string; srcset?: string }>();

    const inliningPromises = images.map(async (img) => {
        const originalSrc = img.getAttribute('src') || '';
        const originalSrcset = img.getAttribute('srcset') || undefined;
        originalSources.set(img, { src: originalSrc, srcset: originalSrcset });

        const dataUrl = await fetchImageAsDataUrl(img);
        if (dataUrl && dataUrl.startsWith('data:')) {
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
            img.setAttribute('src', dataUrl);
        }
    });

    const svgImages = Array.from(rootElement.querySelectorAll<SVGImageElement>('image'));
    const svgPromises = svgImages.map(async (svgImg) => {
        const href = svgImg.getAttribute('href') || svgImg.getAttribute('xlink:href') || '';
        if (href && !href.startsWith('data:')) {
            const dataUrl = await fetchUrlAsDataUrl(href);
            if (dataUrl && dataUrl.startsWith('data:')) {
                svgImg.setAttribute('href', dataUrl);
                if (svgImg.hasAttribute('xlink:href')) {
                    svgImg.setAttribute('xlink:href', dataUrl);
                }
            }
        }
    });

    const allElements = [rootElement, ...Array.from(rootElement.querySelectorAll<HTMLElement>('*'))];
    const bgPromises = allElements.map(async (el) => {
        const bg = el.style.backgroundImage || window.getComputedStyle(el).backgroundImage;
        if (!bg || bg === 'none') return;

        const match = bg.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/i);
        if (match && match[1]) {
            const bgUrl = match[1];
            const dataUrl = await fetchUrlAsDataUrl(bgUrl);
            if (dataUrl && dataUrl.startsWith('data:')) {
                el.style.backgroundImage = `url("${dataUrl}")`;
            }
        }
    });

    await Promise.all([...inliningPromises, ...svgPromises, ...bgPromises]);

    return () => {
        originalSources.clear();
    };
}
