const HTML_NS = 'http://www.w3.org/1999/xhtml';

export type PseudoElement = '::before' | '::after' | '::marker' | '::placeholder';

/**
 * Resolved against the page layout, so a coincidental match with the sandbox value says nothing
 * about what the clone would compute on its own.
 */
const ALWAYS_COPIED = new Set(['width', 'height']);

/**
 * Never inherited, so matching the browser default is enough to leave them out. Writing the default
 * anyway would count as author styling, which strips the native look of inputs, selects and buttons.
 */
const BOX_DECORATION =
    /^(background|padding|margin|outline|border-(top|right|bottom|left|block|inline|start|end|image|width|style|color))/;

/** Computed styles of elements that no page stylesheet reaches: the browser defaults per tag. */
export interface StyleSandbox {
    defaultsFor(element: Element, pseudo?: PseudoElement): ReadonlyMap<string, string>;
    dispose(): void;
}

function snapshotStyle(style: CSSStyleDeclaration): Map<string, string> {
    const values = new Map<string, string>();
    for (let i = 0; i < style.length; i++) {
        const name = style[i];
        values.set(name, style.getPropertyValue(name));
    }
    return values;
}

export function createStyleSandbox(): StyleSandbox {
    const host = document.createElement('div');
    // Page rules cannot cross the shadow boundary, and `all: initial` stops inherited values leaking in.
    host.style.cssText =
        'all: initial; position: fixed; left: 0; top: 0; width: 0; height: 0; overflow: hidden; pointer-events: none;';
    const root = host.attachShadow({ mode: 'closed' });
    document.documentElement.appendChild(host);

    const cache = new Map<string, ReadonlyMap<string, string>>();

    return {
        defaultsFor(element, pseudo) {
            // Creating a defined custom element would run page code; undefined ones behave like a span.
            const tag = element.localName.includes('-') ? 'span' : element.localName;
            const namespace = element.namespaceURI ?? HTML_NS;
            const key = `${namespace}|${tag}|${pseudo ?? ''}`;

            let defaults = cache.get(key);
            if (!defaults) {
                const probe = document.createElementNS(namespace, tag);
                root.appendChild(probe);
                defaults = snapshotStyle(window.getComputedStyle(probe, pseudo));
                probe.remove();
                cache.set(key, defaults);
            }
            return defaults;
        },
        dispose() {
            host.remove();
        },
    };
}

/**
 * The declarations the clone needs to reproduce `style`. A property is left out only when the clone
 * would arrive at the same value anyway: it equals the browser default and, unless it is known not
 * to inherit, the parent value too. Without a parent every property is kept.
 */
export function diffComputedStyle(
    style: CSSStyleDeclaration,
    parent: CSSStyleDeclaration | null,
    defaults: ReadonlyMap<string, string>
): [string, string][] {
    const declarations: [string, string][] = [];

    for (let i = 0; i < style.length; i++) {
        const name = style[i];
        // Every var() is already substituted in computed values, so custom properties are dead weight.
        if (name.startsWith('--')) continue;

        const value = style.getPropertyValue(name);
        if (
            parent &&
            !ALWAYS_COPIED.has(name) &&
            value === defaults.get(name) &&
            (BOX_DECORATION.test(name) || value === parent.getPropertyValue(name))
        ) {
            continue;
        }
        declarations.push([name, value]);
    }

    return declarations;
}
