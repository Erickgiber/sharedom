import { DomTarget } from './types';

export function resolveElement(target: DomTarget): HTMLElement {
    if (typeof document === 'undefined') {
        throw new Error(
            '[sharedom]: DOM operations require a browser environment (document is undefined). ' +
            'For server-side rendering (SSR/Node.js), use the "sharedom/ssr" module.'
        );
    }

    if (typeof target === 'string') {
        const element = document.querySelector<HTMLElement>(target);
        if (!element) {
            throw new Error(`[sharedom]: No element found matching selector "${target}".`);
        }
        return element;
    }

    if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
        return target;
    }

    throw new Error('[sharedom]: Target must be a valid CSS selector string or an HTMLElement.');
}

export function validateElementDimensions(element: HTMLElement): { width: number; height: number } {
    const rect = element.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    if (width <= 0 || height <= 0) {
        throw new Error('[sharedom]: Cannot capture element with width or height of 0. Ensure the element is visible in the DOM.');
    }

    return { width, height };
}

export function validateOptions(options: { scale?: number; quality?: number; format?: string }): void {
    if (options.scale !== undefined && (typeof options.scale !== 'number' || options.scale <= 0)) {
        throw new Error('[sharedom]: Scale option must be a positive number.');
    }

    if (options.quality !== undefined && (typeof options.quality !== 'number' || options.quality < 0 || options.quality > 1)) {
        throw new Error('[sharedom]: Quality option must be a number between 0 and 1.');
    }

    if (options.format !== undefined && options.format !== 'png' && options.format !== 'jpeg' && options.format !== 'webp') {
        throw new Error('[sharedom]: Format option must be "png", "jpeg", or "webp".');
    }
}

export function syncDynamicStates(source: Element, target: Element): void {
    if (typeof HTMLInputElement !== 'undefined' && source instanceof HTMLInputElement && target instanceof HTMLInputElement) {
        target.setAttribute('value', source.value);
        target.value = source.value;
        if (source.checked) {
            target.setAttribute('checked', '');
            target.checked = true;
        }
    } else if (typeof HTMLTextAreaElement !== 'undefined' && source instanceof HTMLTextAreaElement && target instanceof HTMLTextAreaElement) {
        target.textContent = source.value;
        target.value = source.value;
    } else if (typeof HTMLSelectElement !== 'undefined' && source instanceof HTMLSelectElement && target instanceof HTMLSelectElement) {
        target.value = source.value;
        const targetOptions = target.querySelectorAll('option');
        const selectedIndex = source.selectedIndex;
        if (selectedIndex >= 0 && targetOptions[selectedIndex]) {
            targetOptions[selectedIndex].setAttribute('selected', 'true');
        }
    } else if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement && target instanceof HTMLCanvasElement) {
        try {
            const dataUrl = source.toDataURL();
            const image = new Image();
            image.src = dataUrl;
            target.replaceWith(image);
        } catch {
            // Keep target canvas as-is if tainted
        }
    }

    const sourceChildren = Array.from(source.children);
    const targetChildren = Array.from(target.children);
    for (let i = 0; i < sourceChildren.length; i++) {
        if (targetChildren[i]) {
            syncDynamicStates(sourceChildren[i], targetChildren[i]);
        }
    }
}
