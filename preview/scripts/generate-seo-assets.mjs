/**
 * Regenerates every SEO artifact that quotes a fact about the release, so none of
 * them can drift behind the source: the social card, the PWA raster icons, the
 * softwareVersion in the landing page JSON-LD, and the bundle size shown on the
 * card and the playground (which lives in all eight translations).
 *
 * Social crawlers (Facebook, X, LinkedIn, Slack, Discord, WhatsApp) ignore SVG
 * previews, so the card must ship as PNG; rendering happens here and the results
 * are committed, so the Pages workflow never needs a browser.
 *
 * Run after every version bump or library change: `npm run assets:seo`.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '../..');
const previewDir = path.resolve(scriptDir, '..');
const publicDir = path.join(previewDir, 'public');
const { version } = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

const FONTS =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=JetBrains+Mono:wght@600&display=block';

/**
 * What a consumer actually ships: the published entry bundled and minified in one
 * pass, the way an app's bundler treats it, then gzipped. Measuring the built
 * `dist/` rather than `src/` keeps the number tied to what npm serves.
 */
async function measureLibrary() {
  const entry = path.join(rootDir, 'dist/index.js');
  if (!fs.existsSync(entry)) {
    throw new Error('dist/index.js is missing — run `npm run build` before measuring the bundle.');
  }
  const result = await build({
    stdin: { contents: `export * from ${JSON.stringify(entry)};`, resolveDir: rootDir, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
  });
  const gzipped = zlib.gzipSync(result.outputFiles[0].contents, { level: 9 }).length;
  return `${(gzipped / 1000).toFixed(1)} kB Gzipped`;
}

/** Every hand-edited copy of a release fact is a copy that silently goes stale. */
function stamp(file, pattern, replacement) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(pattern, replacement);
  if (after === before) return false;
  fs.writeFileSync(file, after);
  console.log(`  updated ${path.relative(rootDir, file)}`);
  return true;
}

function stampFacts(bundleSize) {
  console.log(`stamping v${version} and "${bundleSize}"`);

  const card = path.join(publicDir, 'og-image.svg');
  stamp(card, /(<text[^>]*>)v\d+\.\d+\.\d+(<)/, `$1v${version}$2`);
  stamp(card, /(<text[^>]*>⚡ )[^<]*(<)/, `$1${bundleSize}$2`);

  const landing = path.join(previewDir, 'index.html');
  stamp(landing, /("softwareVersion": ")\d+\.\d+\.\d+(")/, `$1${version}$2`);
  stamp(landing, /(data-i18n="playground\.cardStat2Val"[^>]*>)[^<]*(<)/, `$1${bundleSize}$2`);

  for (const file of fs.readdirSync(path.join(previewDir, 'src/i18n'))) {
    if (!/^[a-z]{2}\.ts$/.test(file)) continue;
    stamp(path.join(previewDir, 'src/i18n', file), /(cardStat2Val: ')[^']*(')/, `$1${bundleSize}$2`);
  }
}

function svgPage(svg, { width, height, fonts, background }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
${fonts ? `<link rel="stylesheet" href="${FONTS}" />` : ''}
<style>html,body{margin:0;padding:0;background:${background}}svg{display:block;width:${width}px;height:${height}px}</style>
</head><body>${svg}</body></html>`;
}

/** PNG stores width and height as big-endian uint32 at the start of the IHDR chunk. */
function pngSize(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function renderImages() {
  const browser = await chromium.launch();
  try {
    for (const [source, target, options] of [
      ['og-image.svg', 'og-image.png', { width: 1200, height: 630, fonts: true }],
      ['favicon.svg', 'icon-192.png', { width: 192, height: 192, fonts: false }],
      ['favicon.svg', 'icon-512.png', { width: 512, height: 512, fonts: false }],
    ]) {
      const size = { width: options.width, height: options.height };
      const svg = fs.readFileSync(path.join(publicDir, source), 'utf8');

      const tab = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
      await tab.setContent(svgPage(svg, { ...options, background: '#08090d' }), { waitUntil: 'load' });
      await tab.evaluate(() => document.fonts.ready);
      const buffer = await tab.screenshot({ type: 'png' });
      await tab.close();

      const info = pngSize(buffer);
      if (info.width !== size.width || info.height !== size.height) {
        throw new Error(`${target}: expected ${size.width}x${size.height}, got ${info.width}x${info.height}`);
      }
      fs.writeFileSync(path.join(publicDir, target), buffer);
      console.log(`  ${target}  ${info.width}x${info.height}  ${(buffer.length / 1024).toFixed(1)} kB`);
    }
  } finally {
    await browser.close();
  }
}

stampFacts(await measureLibrary());
console.log('rendering images');
await renderImages();
