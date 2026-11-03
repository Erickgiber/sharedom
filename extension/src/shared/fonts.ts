import fontFaces from '../../fonts/fonts.json';

const FONTS_DIRECTORY = 'fonts';

let areFontsRegistered = false;

export function registerExtensionFonts(): void {
  if (areFontsRegistered || typeof FontFace === 'undefined') return;
  areFontsRegistered = true;

  for (const face of fontFaces) {
    const url = chrome.runtime.getURL(`${FONTS_DIRECTORY}/${face.file}`);
    try {
      document.fonts.add(
        new FontFace(face.family, `url("${url}") format("woff2")`, {
          weight: face.weight,
          unicodeRange: face.unicodeRange,
          display: 'swap',
        })
      );
    } catch {}
  }
}
