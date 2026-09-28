import { CaptureOptions } from './types';
import { validateElementDimensions } from './dom';
import { createStyleSandbox } from './styles';
import { ClonedTree, cloneTree, collapsedTopMargin } from './clone';
import { inlineImages } from './images';
import { embedFontFaces } from './fonts';
import { createSvgDataUrl } from './svg';
import { fitCanvasSize, renderSvgToCanvas } from './canvas';

export interface RasterizedElement {
    dataUrl: string;
    /** Real pixel size of the bitmap, which is below width x scale when canvas limits apply. */
    width: number;
    height: number;
}

/** The clone is drawn at the origin of its own frame; page offsets and transforms would push it out. */
function placeRoot(root: HTMLElement, width: number, height: number, marginTop: number): void {
    root.style.width = `${width}px`;
    root.style.height = `${height}px`;
    root.style.boxSizing = 'border-box';
    root.style.margin = '0';
    root.style.marginTop = `${-marginTop}px`;
    root.style.inset = 'auto';
    root.style.transform = 'none';
    root.style.translate = 'none';
    root.style.rotate = 'none';
    root.style.scale = 'none';

    const { position } = root.style;
    if (position === 'absolute' || position === 'fixed' || position === 'sticky') {
        root.style.position = 'relative';
    }
}

function cloneWithSandbox(element: HTMLElement): ClonedTree {
    const sandbox = createStyleSandbox();
    try {
        return cloneTree(element, sandbox);
    } finally {
        sandbox.dispose();
    }
}

export async function rasterizeElement(
    element: HTMLElement,
    options: CaptureOptions
): Promise<RasterizedElement> {
    // Text measured before the page's web fonts load would wrap differently than what the user sees.
    await document.fonts.ready;

    const measured = validateElementDimensions(element);
    const width = options.width ?? measured.width;
    const height = options.height ?? measured.height;

    const tree = cloneWithSandbox(element);
    placeRoot(tree.root, width, height, collapsedTopMargin(element));

    const [pseudoCss, fontCss] = await Promise.all([
        inlineImages({ root: tree.root, images: tree.images, css: tree.pseudoCss }),
        embedFontFaces(tree.fontFamilies, tree.text),
    ]);

    const size = fitCanvasSize(width, height, options.scale ?? 1);
    const svgDataUrl = createSvgDataUrl(
        {
            root: tree.root,
            css: [fontCss, pseudoCss].filter(Boolean).join('\n'),
            definitions: tree.definitions,
        },
        width,
        height,
        size.width,
        size.height
    );
    const dataUrl = await renderSvgToCanvas(svgDataUrl, size, options);

    return { dataUrl, width: size.width, height: size.height };
}
