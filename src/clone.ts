import { snapshotMediaElement } from './media';
import { PseudoElement, StyleSandbox, diffComputedStyle } from './styles';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/**
 * Never rendered, or rendered wrongly inside the SVG image: it has scripting disabled, so
 * <noscript> would show its fallback, and page CSS must not reach the clone.
 */
const SKIPPED_TAGS = new Set(['script', 'noscript', 'style', 'link', 'template', 'meta', 'title']);

/** Their children are fallback content, never what the user sees on the page. */
const CHILDLESS_TAGS = new Set(['canvas', 'video', 'audio', 'iframe', 'textarea']);

/** Properties that can point at an SVG definition elsewhere in the document with url(#id). */
const REFERENCING_PROPERTIES = [
    'fill',
    'stroke',
    'clip-path',
    'mask',
    'filter',
    'marker-start',
    'marker-mid',
    'marker-end',
];

const LOCAL_REFERENCE = /url\(["']?#([^"')]+)["']?\)/g;

export interface ClonedTree {
    root: HTMLElement;
    /** Rules for pseudo-elements, which cannot be expressed as inline styles. */
    pseudoCss: string;
    /** Clone → source, so an unreadable image can fall back to the pixels the page already decoded. */
    images: Map<HTMLImageElement, HTMLImageElement>;
    /** SVG definitions the clone references by id but that live outside the captured element. */
    definitions: Element[];
    fontFamilies: Set<string>;
    /** Every piece of text the clone renders, used to pick the font subsets worth embedding. */
    text: string;
}

interface CloneContext {
    /** Elements created in a document without a browsing context never load resources or upgrade. */
    doc: Document;
    sandbox: StyleSandbox;
    pseudoRules: string[];
    images: Map<HTMLImageElement, HTMLImageElement>;
    references: Map<string, Document | ShadowRoot>;
    fontFamilies: Set<string>;
    textParts: string[];
}

function inlineStyleOf(element: Element): CSSStyleDeclaration | null {
    if (element instanceof HTMLElement || element instanceof SVGElement) return element.style;
    return typeof MathMLElement !== 'undefined' && element instanceof MathMLElement ? element.style : null;
}

function collectFontFamilies(fontFamily: string, families: Set<string>): void {
    for (const family of fontFamily.split(',')) {
        const name = family
            .trim()
            .replace(/^["']|["']$/g, '')
            .toLowerCase();
        if (name) families.add(name);
    }
}

function pseudoElementsOf(source: Element, style: CSSStyleDeclaration): PseudoElement[] {
    const pseudos: PseudoElement[] = ['::before', '::after'];
    if (style.display === 'list-item') pseudos.push('::marker');
    if (
        (source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement) &&
        source.placeholder &&
        !source.value
    ) {
        pseudos.push('::placeholder');
    }
    return pseudos;
}

function clonePseudoElements(
    source: Element,
    clone: Element,
    style: CSSStyleDeclaration,
    ctx: CloneContext
): void {
    let className: string | null = null;

    for (const pseudo of pseudoElementsOf(source, style)) {
        const pseudoStyle = window.getComputedStyle(source, pseudo);
        const needsContent = pseudo === '::before' || pseudo === '::after';
        if (needsContent && (pseudoStyle.content === 'none' || pseudoStyle.content === 'normal')) continue;

        const declarations = diffComputedStyle(
            pseudoStyle,
            style,
            ctx.sandbox.defaultsFor(source, pseudoStyle, pseudo)
        );
        if (declarations.length === 0) continue;

        if (!className) {
            className = `sharedom-pseudo-${ctx.pseudoRules.length}`;
            clone.classList.add(className);
        }
        const body = declarations.map(([name, value]) => `${name}: ${value};`).join(' ');
        ctx.pseudoRules.push(`.${className}${pseudo} { ${body} }`);
        ctx.textParts.push(pseudoStyle.content);
        collectFontFamilies(pseudoStyle.fontFamily, ctx.fontFamilies);
    }
}

/** A clone only carries attributes, so the live state the user produced is written back into them. */
function syncFormState(source: Element, clone: Element, ctx: CloneContext): void {
    if (source instanceof HTMLInputElement) {
        // A file input refuses a value and shows the chosen file name without one anyway.
        if (source.type !== 'file') clone.setAttribute('value', source.value);
        clone.toggleAttribute('checked', source.checked);
        ctx.textParts.push(source.value);
    } else if (source instanceof HTMLTextAreaElement) {
        clone.textContent = source.value;
        ctx.textParts.push(source.value);
    } else if (source instanceof HTMLOptionElement) {
        clone.toggleAttribute('selected', source.selected);
    }
}

function prepareImage(source: HTMLImageElement, clone: HTMLImageElement, ctx: CloneContext): void {
    // The candidate the browser picked from srcset/<picture>; the clone must not choose again.
    const src = source.currentSrc || source.src;
    if (src) clone.setAttribute('src', src);
    clone.removeAttribute('srcset');
    clone.removeAttribute('sizes');
    // Lazy images never load inside an SVG image.
    clone.removeAttribute('loading');
    ctx.images.set(clone, source);
}

function collectReferences(
    source: Element,
    clone: Element,
    style: CSSStyleDeclaration,
    ctx: CloneContext
): void {
    const scope = source.getRootNode();
    if (!(scope instanceof Document || scope instanceof ShadowRoot)) return;

    const values = REFERENCING_PROPERTIES.map((name) => style.getPropertyValue(name));

    if (source.namespaceURI === SVG_NS) {
        const href = clone.getAttribute('href') ?? clone.getAttributeNS(XLINK_NS, 'href');
        if (href?.startsWith('#')) {
            ctx.references.set(decodeURIComponent(href.slice(1)), scope);
        } else if (href && source.localName === 'image') {
            // The clone lives in a document without a base URL, so relative links would break.
            clone.setAttribute('href', new URL(href, source.baseURI).href);
            clone.removeAttributeNS(XLINK_NS, 'href');
        }
    }

    for (const value of values) {
        for (const match of value.matchAll(LOCAL_REFERENCE)) {
            ctx.references.set(match[1], scope);
        }
    }
}

/** The nodes the browser actually renders as children: shadow content and slot assignments included. */
function renderedChildren(source: Element): ArrayLike<Node> {
    if (CHILDLESS_TAGS.has(source.localName)) return [];
    if (source.shadowRoot) return source.shadowRoot.childNodes;
    if (source instanceof HTMLSlotElement) {
        const assigned = source.assignedNodes();
        return assigned.length > 0 ? assigned : source.childNodes;
    }
    return source.childNodes;
}

const BLOCK_DISPLAYS = new Set(['block', 'list-item', 'table', 'flex', 'grid', 'flow-root']);

/** Whether a child's top margin can escape the element, as it does without border, padding or a BFC. */
function letsTopMarginThrough(style: CSSStyleDeclaration): boolean {
    return (
        (style.display === 'block' || style.display === 'list-item') &&
        style.borderTopWidth === '0px' &&
        style.paddingTop === '0px' &&
        style.overflowY === 'visible' &&
        style.float === 'none' &&
        style.position !== 'absolute' &&
        style.position !== 'fixed'
    );
}

/**
 * On the page, the top margin of the first child (a heading, a paragraph) collapses through the
 * element and sits outside it. The clone has nothing above it to collapse into, so that margin
 * would push the content down; its size is returned so the caller can cancel it.
 */
export function collapsedTopMargin(element: Element): number {
    if (!letsTopMarginThrough(window.getComputedStyle(element))) return 0;

    for (const child of Array.from(renderedChildren(element))) {
        if (child instanceof Text) {
            // Text starts a line box, which stops the collapse.
            if (child.data.trim()) return 0;
            continue;
        }
        if (!(child instanceof Element)) continue;

        const style = window.getComputedStyle(child);
        const outOfFlow =
            style.position === 'absolute' || style.position === 'fixed' || style.float !== 'none';
        if (style.display === 'none' || outOfFlow) continue;
        if (!BLOCK_DISPLAYS.has(style.display)) return 0;

        return Math.max(0, parseFloat(style.marginTop), collapsedTopMargin(child));
    }
    return 0;
}

/**
 * The SVG image cannot be scrolled, so the offset of a scrolled container is applied to its
 * children instead: a transform for boxes, a relative offset for inline content.
 */
function applyScrollOffset(
    child: Node,
    source: Node,
    scrollX: number,
    scrollY: number,
    ctx: CloneContext
): Node {
    if (child instanceof Text) {
        if (!child.data.trim()) return child;
        const wrapper = ctx.doc.createElement('span');
        wrapper.style.position = 'relative';
        wrapper.style.left = `${-scrollX}px`;
        wrapper.style.top = `${-scrollY}px`;
        wrapper.appendChild(child);
        return wrapper;
    }

    const inlineStyle = child instanceof Element ? inlineStyleOf(child) : null;
    if (!inlineStyle || !(source instanceof Element)) return child;

    const style = window.getComputedStyle(source);
    // Fixed and sticky boxes stay put while the container scrolls.
    if (style.position === 'fixed' || style.position === 'sticky') return child;

    if (style.display === 'inline') {
        if (style.position === 'static') inlineStyle.setProperty('position', 'relative');
        const left = style.left === 'auto' ? '0px' : style.left;
        const top = style.top === 'auto' ? '0px' : style.top;
        inlineStyle.setProperty('left', `calc(${left} - ${scrollX}px)`);
        inlineStyle.setProperty('top', `calc(${top} - ${scrollY}px)`);
    } else {
        const own = style.transform === 'none' ? '' : ` ${style.transform}`;
        inlineStyle.setProperty('transform', `translate(${-scrollX}px, ${-scrollY}px)${own}`);
    }
    return child;
}

function cloneNode(source: Node, parentStyle: CSSStyleDeclaration | null, ctx: CloneContext): Node | null {
    if (source instanceof Text) {
        ctx.textParts.push(source.data);
        return ctx.doc.createTextNode(source.data);
    }
    return source instanceof Element ? cloneElement(source, parentStyle, ctx) : null;
}

function cloneElement(
    source: Element,
    parentStyle: CSSStyleDeclaration | null,
    ctx: CloneContext
): Element | null {
    if (SKIPPED_TAGS.has(source.localName)) return null;
    // A <source> would make the clone pick its own candidate again; prepareImage fixed the choice.
    if (source.localName === 'source' && source.parentElement instanceof HTMLPictureElement) return null;

    const style = window.getComputedStyle(source);
    // SVG definitions (<symbol>, gradients…) are display:none yet referenced by visible shapes.
    if (source.namespaceURI !== SVG_NS && style.display === 'none') return null;

    const media = snapshotMediaElement(source);
    const clone = media ?? ctx.doc.importNode(source, false);

    const inlineStyle = inlineStyleOf(clone);
    if (inlineStyle) {
        clone.removeAttribute('style');
        for (const [name, value] of diffComputedStyle(
            style,
            parentStyle,
            ctx.sandbox.defaultsFor(clone, style)
        )) {
            inlineStyle.setProperty(name, value);
        }
    }

    collectFontFamilies(style.fontFamily, ctx.fontFamilies);
    collectReferences(source, clone, style, ctx);
    if (source instanceof HTMLElement) clonePseudoElements(source, clone, style, ctx);
    if (media) return clone;

    syncFormState(source, clone, ctx);
    if (source instanceof HTMLImageElement && clone instanceof HTMLImageElement)
        prepareImage(source, clone, ctx);

    const { scrollLeft, scrollTop } = source;
    for (const child of Array.from(renderedChildren(source))) {
        const childClone = cloneNode(child, style, ctx);
        if (!childClone) continue;
        clone.appendChild(
            scrollLeft || scrollTop
                ? applyScrollOffset(childClone, child, scrollLeft, scrollTop, ctx)
                : childClone
        );
    }

    return clone;
}

function referencesIn(element: Element): string[] {
    const ids: string[] = [];
    for (const node of [element, ...Array.from(element.querySelectorAll('*'))]) {
        for (const attribute of Array.from(node.attributes)) {
            if (attribute.localName === 'href' && attribute.value.startsWith('#')) {
                ids.push(decodeURIComponent(attribute.value.slice(1)));
            }
            for (const match of attribute.value.matchAll(LOCAL_REFERENCE)) ids.push(match[1]);
        }
    }
    return ids;
}

/** Copies definitions such as sprite <symbol>s, gradients and filters that the clone points to. */
function cloneDefinitions(root: HTMLElement, ctx: CloneContext): Element[] {
    const definitions: Element[] = [];
    const visited = new Set<string>();
    const pending = Array.from(ctx.references);

    for (let entry = pending.pop(); entry; entry = pending.pop()) {
        const [id, scope] = entry;
        if (visited.has(id)) continue;
        visited.add(id);

        if (root.querySelector(`#${CSS.escape(id)}`)) continue;
        const definition = scope.getElementById(id);
        if (!definition) continue;

        const copy = ctx.doc.importNode(definition, true);
        definitions.push(copy);
        for (const nested of referencesIn(copy)) pending.push([nested, scope]);
    }

    return definitions;
}

export function cloneTree(source: HTMLElement, sandbox: StyleSandbox): ClonedTree {
    const ctx: CloneContext = {
        doc: document.implementation.createHTMLDocument(''),
        sandbox,
        pseudoRules: [],
        images: new Map(),
        references: new Map(),
        fontFamilies: new Set(),
        textParts: [],
    };

    const root = cloneElement(source, null, ctx);
    if (!(root instanceof HTMLElement)) {
        throw new Error('[sharedom]: The target element is not rendered, so there is nothing to capture.');
    }

    return {
        root,
        pseudoCss: ctx.pseudoRules.join('\n'),
        images: ctx.images,
        definitions: cloneDefinitions(root, ctx),
        fontFamilies: ctx.fontFamilies,
        text: ctx.textParts.join(''),
    };
}
