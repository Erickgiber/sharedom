import { fetchAsDataUrl } from './images';

/** Font files do not change behind the same URL, so every capture of the session shares them. */
const fontCache = new Map<string, Promise<string | null>>();

/** Formats Chromium, Firefox and Safari all render; the browser skips any other src entry too. */
const SUPPORTED_FORMATS = new Set([
    'woff2',
    'woff',
    'truetype',
    'opentype',
    'collection',
    'woff2-variations',
    'woff-variations',
    'truetype-variations',
    'opentype-variations',
]);

const SRC_ENTRY = /url\((["']?)(.*?)\1\)\s*(?:format\((["']?)(.*?)\3\))?/g;

interface FontFaceSource {
    rule: CSSFontFaceRule;
    baseUrl: string;
}

function readableRules(sheet: CSSStyleSheet): CSSRuleList | null {
    try {
        return sheet.cssRules;
    } catch {
        // Cross-origin stylesheets loaded without CORS hide their rules from scripts.
        return null;
    }
}

async function fetchRules(href: string): Promise<CSSRuleList | null> {
    try {
        const response = await fetch(href, { mode: 'cors' });
        if (!response.ok) return null;
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(await response.text());
        return sheet.cssRules;
    } catch {
        // The stylesheet cannot be read by this page either, so its fonts cannot be embedded.
        return null;
    }
}

async function collectFontFaces(rules: CSSRuleList, baseUrl: string): Promise<FontFaceSource[]> {
    const found: FontFaceSource[] = [];

    for (const rule of Array.from(rules)) {
        if (rule instanceof CSSFontFaceRule) {
            found.push({ rule, baseUrl });
        } else if (rule instanceof CSSImportRule && rule.styleSheet) {
            found.push(...(await collectFromSheet(rule.styleSheet, new URL(rule.href, baseUrl).href)));
        } else if (rule instanceof CSSGroupingRule) {
            found.push(...(await collectFontFaces(rule.cssRules, baseUrl)));
        }
    }

    return found;
}

async function collectFromSheet(sheet: CSSStyleSheet, baseUrl: string): Promise<FontFaceSource[]> {
    const rules = readableRules(sheet) ?? (sheet.href ? await fetchRules(sheet.href) : null);
    return rules ? collectFontFaces(rules, baseUrl) : [];
}

function normalizeFamily(family: string): string {
    return family
        .trim()
        .replace(/^["']|["']$/g, '')
        .toLowerCase();
}

/** Whether any rendered character falls inside the face's unicode-range (no range covers everything). */
function coversText(unicodeRange: string, codePoints: ReadonlySet<number>): boolean {
    if (!unicodeRange.trim()) return true;

    return unicodeRange.split(',').some((part) => {
        const [startHex, endHex] = part.trim().replace(/^u\+/i, '').split('-');
        const start = parseInt(startHex.replace(/\?/g, '0'), 16);
        const end = parseInt((endHex ?? startHex).replace(/\?/g, 'F'), 16);
        for (const codePoint of codePoints) {
            if (codePoint >= start && codePoint <= end) return true;
        }
        return false;
    });
}

function pickSource(src: string, baseUrl: string): { url: string; format: string | undefined } | null {
    for (const match of src.matchAll(SRC_ENTRY)) {
        const format = match[4]?.toLowerCase();
        if (format && !SUPPORTED_FORMATS.has(format)) continue;
        return { url: match[2].startsWith('data:') ? match[2] : new URL(match[2], baseUrl).href, format };
    }
    return null;
}

function loadFont(url: string): Promise<string | null> {
    if (url.startsWith('data:')) return Promise.resolve(url);
    let pending = fontCache.get(url);
    if (!pending) {
        pending = fetchAsDataUrl(url);
        fontCache.set(url, pending);
    }
    return pending;
}

async function inlineFontFace({ rule, baseUrl }: FontFaceSource): Promise<string> {
    const source = pickSource(rule.style.getPropertyValue('src'), baseUrl);
    // local() fonts are read from the system, which the SVG image can do on its own.
    if (!source) return rule.cssText;

    const dataUrl = await loadFont(source.url);
    if (!dataUrl) return '';

    const descriptors: string[] = [];
    for (let i = 0; i < rule.style.length; i++) {
        const name = rule.style[i];
        if (name !== 'src') descriptors.push(`${name}: ${rule.style.getPropertyValue(name)};`);
    }
    const format = source.format ? ` format("${source.format}")` : '';
    descriptors.push(`src: url("${dataUrl}")${format};`);

    return `@font-face { ${descriptors.join(' ')} }`;
}

/**
 * An SVG image cannot load font files, so the @font-face rules the clone uses are returned with
 * their files inlined. Faces are filtered by family and by unicode-range against the rendered
 * text, which keeps subsetted fonts (Google Fonts, CJK) from embedding dozens of unused files.
 */
export async function embedFontFaces(families: ReadonlySet<string>, text: string): Promise<string> {
    const sheets = [...Array.from(document.styleSheets), ...document.adoptedStyleSheets];
    const faces = (
        await Promise.all(sheets.map((sheet) => collectFromSheet(sheet, sheet.href ?? document.baseURI)))
    ).flat();

    const codePoints = new Set<number>();
    for (const character of text) {
        const codePoint = character.codePointAt(0);
        if (codePoint !== undefined) codePoints.add(codePoint);
    }

    const used = faces.filter(
        ({ rule }) =>
            families.has(normalizeFamily(rule.style.getPropertyValue('font-family'))) &&
            coversText(rule.style.getPropertyValue('unicode-range'), codePoints)
    );

    return (await Promise.all(used.map(inlineFontFace))).filter(Boolean).join('\n');
}
