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

/**
 * The clone is laid out without the transforms of the element and its ancestors, so a transformed
 * element is measured by its layout box. Otherwise the fractional on-screen size is kept, because
 * rounding it can make text wrap differently in the clone.
 */
export function validateElementDimensions(element: HTMLElement): { width: number; height: number } {
    const rect = element.getBoundingClientRect();
    const isTransformed =
        Math.abs(rect.width - element.offsetWidth) >= 1 || Math.abs(rect.height - element.offsetHeight) >= 1;
    const width = isTransformed ? element.offsetWidth : rect.width;
    const height = isTransformed ? element.offsetHeight : rect.height;

    if (width <= 0 || height <= 0) {
        throw new Error(
            '[sharedom]: Cannot capture element with width or height of 0. Ensure the element is visible in the DOM.'
        );
    }

    return { width, height };
}

export function validateOptions(options: { scale?: number; quality?: number; format?: string }): void {
    if (options.scale !== undefined && (typeof options.scale !== 'number' || options.scale <= 0)) {
        throw new Error('[sharedom]: Scale option must be a positive number.');
    }

    if (
        options.quality !== undefined &&
        (typeof options.quality !== 'number' || options.quality < 0 || options.quality > 1)
    ) {
        throw new Error('[sharedom]: Quality option must be a number between 0 and 1.');
    }

    if (
        options.format !== undefined &&
        options.format !== 'png' &&
        options.format !== 'jpeg' &&
        options.format !== 'webp'
    ) {
        throw new Error('[sharedom]: Format option must be "png", "jpeg", or "webp".');
    }
}
