const HTML_NS = 'http://www.w3.org/1999/xhtml';

export type PseudoElement = '::before' | '::after' | '::marker' | '::placeholder';

/**
 * Resolved against the page layout, so a coincidental match with the sandbox value says nothing
 * about what the clone would compute on its own.
 */
const ALWAYS_COPIED = new Set(['width', 'height']);

/**
 * Never inherited, so matching the (contextual) browser default is enough to leave them out. Writing
 * the default anyway would count as author styling, which strips the native look of form controls.
 */
const BOX_DECORATION =
    /^(background|padding|margin|outline|border-(top|right|bottom|left|block|inline|start|end|image|width|style|color))/;

/**
 * Browser defaults that resolve against other properties of the same box: border and outline widths
 * compute to 0 without a style, colors default to currentcolor and UA margins are in em. The probe
 * takes these from the real element, so its defaults are the ones the clone will actually compute.
 */
const CONTEXT_PROPERTIES = [
    'font-size',
    'color',
    'writing-mode',
    'direction',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'outline-style',
    'column-rule-style',
];

const PROBE_CLASS = 'sharedom-probe';

/** Computed styles of elements that no page stylesheet reaches: the browser defaults per tag. */
export interface StyleSandbox {
    /** Defaults for `element` in the context described by its computed `style`. */
    defaultsFor(
        element: Element,
        style: CSSStyleDeclaration,
        pseudo?: PseudoElement
    ): ReadonlyMap<string, string>;
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
    // Pseudo-elements cannot take inline styles, so their context is set through this sheet.
    const pseudoSheet = document.createElement('style');
    root.appendChild(pseudoSheet);
    document.documentElement.appendChild(host);

    const cache = new Map<string, ReadonlyMap<string, string>>();

    function probe(
        namespace: string,
        tag: string,
        pseudo: PseudoElement | undefined,
        context: string
    ): Map<string, string> {
        const element = document.createElementNS(namespace, tag);
        if (pseudo) {
            element.setAttribute('class', PROBE_CLASS);
            pseudoSheet.textContent = `.${PROBE_CLASS}${pseudo} { ${context} }`;
        } else {
            element.setAttribute('style', context);
        }
        root.appendChild(element);
        const values = snapshotStyle(window.getComputedStyle(element, pseudo));
        element.remove();
        return values;
    }

    function cached(key: string, read: () => ReadonlyMap<string, string>): ReadonlyMap<string, string> {
        let values = cache.get(key);
        if (!values) {
            values = read();
            cache.set(key, values);
        }
        return values;
    }

    return {
        defaultsFor(element, style, pseudo) {
            // Creating a defined custom element would run page code; undefined ones behave like a span.
            const tag = element.localName.includes('-') ? 'span' : element.localName;
            const namespace = element.namespaceURI ?? HTML_NS;
            const baseKey = `${namespace}|${tag}|${pseudo ?? ''}`;
            const context = CONTEXT_PROPERTIES.map(
                (name) => `${name}: ${style.getPropertyValue(name)};`
            ).join(' ');

            return cached(`${baseKey}|${context}`, () => {
                const base = cached(baseKey, () => probe(namespace, tag, pseudo, ''));
                const defaults = probe(namespace, tag, pseudo, context);
                // The context properties themselves were forced, so their real defaults come from the base.
                for (const name of CONTEXT_PROPERTIES) {
                    const value = base.get(name);
                    if (value !== undefined) defaults.set(name, value);
                }
                return defaults;
            });
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
