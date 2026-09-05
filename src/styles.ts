export function cloneComputedStyles(source: Element, target: Element): void {
    const sourceStyles = window.getComputedStyle(source);
    const targetElement = target as HTMLElement;

    for (let i = 0; i < sourceStyles.length; i++) {
        const key = sourceStyles[i];
        const value = sourceStyles.getPropertyValue(key);
        const priority = sourceStyles.getPropertyPriority(key);
        targetElement.style.setProperty(key, value, priority);
    }

    const sourceChildren = Array.from(source.children);
    const targetChildren = Array.from(target.children);

    for (let i = 0; i < sourceChildren.length; i++) {
        if (targetChildren[i]) {
            cloneComputedStyles(sourceChildren[i], targetChildren[i]);
        }
    }
}

export function getDocumentFontStyles(): string {
    let fontStyles = '';

    const linkElements = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
    for (const link of linkElements) {
        if (link.href) {
            fontStyles += `@import url('${link.href}');\n`;
        }
    }

    try {
        const sheets = Array.from(document.styleSheets);
        for (const sheet of sheets) {
            try {
                const rules = Array.from(sheet.cssRules || []);
                for (const rule of rules) {
                    if (rule instanceof CSSFontFaceRule) {
                        fontStyles += rule.cssText + '\n';
                    }
                }
            } catch {
                continue;
            }
        }
    } catch {
        // Ignore cross-origin security restrictions
    }

    return fontStyles;
}
