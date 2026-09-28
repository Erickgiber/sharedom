const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * XML 1.0 rejects these, and a single one makes the browser refuse the whole SVG image. The page
 * paints them as a blank gap, so they become a space.
 */
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

export interface SvgContent {
    root: HTMLElement;
    css: string;
    /** Elements referenced by id from inside `root`, such as sprite symbols and gradients. */
    definitions: Element[];
}

/**
 * The markup is laid out at `width`x`height` CSS pixels and the viewBox scales it to the pixel size
 * as vectors, so text and borders stay sharp instead of being upscaled from a 1x bitmap.
 */
export function createSvgDataUrl(
    { root, css, definitions }: SvgContent,
    width: number,
    height: number,
    pixelWidth: number,
    pixelHeight: number
): string {
    const doc = root.ownerDocument;
    const wrapper = doc.createElement('div');
    wrapper.setAttribute('style', 'width:100%;height:100%');

    if (css) {
        const style = doc.createElement('style');
        style.textContent = css;
        wrapper.appendChild(style);
    }

    if (definitions.length > 0) {
        const svg = doc.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.setAttribute('style', 'position:absolute;overflow:hidden');
        const defs = doc.createElementNS(SVG_NS, 'defs');
        defs.append(...definitions);
        svg.appendChild(defs);
        wrapper.appendChild(svg);
    }

    wrapper.appendChild(root);

    const markup = new XMLSerializer().serializeToString(wrapper).replace(INVALID_XML_CHARS, ' ');
    const svgString =
        `<svg xmlns="${SVG_NS}" width="${pixelWidth}" height="${pixelHeight}" ` +
        `viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">` +
        `<foreignObject x="0" y="0" width="${width}" height="${height}">${markup}</foreignObject></svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}
