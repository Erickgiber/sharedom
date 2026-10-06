import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ddx = px - x1;
    const ddy = py - y1;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const ddx = px - projX;
  const ddy = py - projY;
  return Math.sqrt(ddx * ddx + ddy * ddy);
}

// Status dot drawn on the "watching" variant, in the same 48x48 virtual space as the logo.
const DOT_CENTER_X = 40;
const DOT_CENTER_Y = 40;
const DOT_RADIUS = 6.2;
const DOT_RING_RADIUS = 7.6;
const DOT_COLOR = [34, 197, 94];
const DOT_RING_COLOR = [12, 12, 15];

// Source-over compositing against a possibly transparent pixel.
function blendOver(r, g, b, a, color, coverage) {
  if (coverage <= 0) return [r, g, b, a];
  const srcA = coverage;
  const dstA = a / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return [0, 0, 0, 0];
  const mix = (src, dst) => Math.round((src * srcA + dst * dstA * (1 - srcA)) / outA);
  return [mix(color[0], r), mix(color[1], g), mix(color[2], b), Math.round(outA * 255)];
}

function paintStatusDot(r, g, b, a, vx, vy) {
  const dist = Math.sqrt((vx - DOT_CENTER_X) ** 2 + (vy - DOT_CENTER_Y) ** 2);
  if (dist > DOT_RING_RADIUS + 0.5) return [r, g, b, a];

  const ringCoverage = Math.max(0, Math.min(1, DOT_RING_RADIUS + 0.5 - dist));
  const fillCoverage = Math.max(0, Math.min(1, DOT_RADIUS + 0.5 - dist));

  const withRing = blendOver(r, g, b, a, DOT_RING_COLOR, ringCoverage);
  return blendOver(withRing[0], withRing[1], withRing[2], withRing[3], DOT_COLOR, fillCoverage);
}

function generatePng(size, watching = false) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc(height * (1 + width * 4));
  const scale = size / 48;

  const cornerRadius = 12 * scale;
  const innerCornerRadius = 11 * scale;

  for (let py = 0; py < height; py++) {
    const rowOffset = py * (1 + width * 4);
    rawData[rowOffset] = 0;

    for (let px = 0; px < width; px++) {
      const pxOffset = rowOffset + 1 + px * 4;

      const x = px + 0.5;
      const y = py + 0.5;
      const vx = x / scale;
      const vy = y / scale;

      const qx = Math.max(Math.abs(x - width / 2) - (width / 2 - cornerRadius), 0);
      const qy = Math.max(Math.abs(y - height / 2) - (height / 2 - cornerRadius), 0);
      const distFromOuter = Math.sqrt(qx * qx + qy * qy) - cornerRadius;

      if (distFromOuter > 0.5) {
        const outside = watching ? paintStatusDot(0, 0, 0, 0, vx, vy) : [0, 0, 0, 0];
        rawData[pxOffset] = outside[0];
        rawData[pxOffset + 1] = outside[1];
        rawData[pxOffset + 2] = outside[2];
        rawData[pxOffset + 3] = outside[3];
        continue;
      }

      const tGrad = Math.max(0, Math.min(1, (vx + vy) / 96));
      let r = Math.round(167 + tGrad * (124 - 167));
      let g = Math.round(139 + tGrad * (58 - 139));
      let b = Math.round(250 + tGrad * (237 - 250));
      let a = Math.round(255 * Math.max(0, Math.min(1, 0.5 - distFromOuter)));

      const iqx = Math.max(Math.abs(x - width / 2) - (width / 2 - scale - innerCornerRadius), 0);
      const iqy = Math.max(Math.abs(y - height / 2) - (height / 2 - scale - innerCornerRadius), 0);
      const distFromInnerBorder = Math.abs(Math.sqrt(iqx * iqx + iqy * iqy) - innerCornerRadius);
      if (distFromInnerBorder < 0.6 * scale && size >= 32) {
        const borderAlpha = Math.max(0, Math.min(1, 0.6 * scale - distFromInnerBorder)) * 0.25;
        r = Math.round(r * (1 - borderAlpha) + 255 * borderAlpha);
        g = Math.round(g * (1 - borderAlpha) + 255 * borderAlpha);
        b = Math.round(b * (1 - borderAlpha) + 255 * borderAlpha);
      }

      const frameDist = Math.min(
        distToSegment(vx, vy, 12, 18, 12, 14),
        distToSegment(vx, vy, 12, 14, 16, 14),
        distToSegment(vx, vy, 36, 18, 36, 14),
        distToSegment(vx, vy, 36, 14, 32, 14),
        distToSegment(vx, vy, 12, 30, 12, 34),
        distToSegment(vx, vy, 12, 34, 16, 34),
        distToSegment(vx, vy, 36, 30, 36, 34),
        distToSegment(vx, vy, 36, 34, 32, 34)
      );

      const frameStrokeRadius = 1.25;
      if (frameDist < frameStrokeRadius + 0.5) {
        const strokeCoverage = Math.max(0, Math.min(1, frameStrokeRadius + 0.5 - frameDist));
        r = Math.round(r * (1 - strokeCoverage) + 255 * strokeCoverage);
        g = Math.round(g * (1 - strokeCoverage) + 255 * strokeCoverage);
        b = Math.round(b * (1 - strokeCoverage) + 255 * strokeCoverage);
      }

      const bracketDist = Math.min(
        distToSegment(vx, vy, 19, 22, 16, 24.5),
        distToSegment(vx, vy, 16, 24.5, 19, 27),
        distToSegment(vx, vy, 29, 22, 32, 24.5),
        distToSegment(vx, vy, 32, 24.5, 29, 27)
      );

      const bracketStrokeRadius = 1.0;
      if (bracketDist < bracketStrokeRadius + 0.5) {
        const strokeCoverage = Math.max(0, Math.min(1, bracketStrokeRadius + 0.5 - bracketDist));
        r = Math.round(r * (1 - strokeCoverage) + 255 * strokeCoverage);
        g = Math.round(g * (1 - strokeCoverage) + 255 * strokeCoverage);
        b = Math.round(b * (1 - strokeCoverage) + 255 * strokeCoverage);
      }

      const centerCircleDist = Math.sqrt((vx - 24) * (vx - 24) + (vy - 24.5) * (vy - 24.5));
      if (centerCircleDist < 3.5) {
        const circleCoverage = Math.max(0, Math.min(1, 3.5 - centerCircleDist));
        r = Math.round(r * (1 - circleCoverage) + 255 * circleCoverage);
        g = Math.round(g * (1 - circleCoverage) + 255 * circleCoverage);
        b = Math.round(b * (1 - circleCoverage) + 255 * circleCoverage);
      }

      const yellowDotDist = Math.sqrt((vx - 34) * (vx - 34) + (vy - 14) * (vy - 14));
      if (yellowDotDist < 1.8) {
        const dotCoverage = Math.max(0, Math.min(1, 1.8 - yellowDotDist));
        r = Math.round(r * (1 - dotCoverage) + 250 * dotCoverage);
        g = Math.round(g * (1 - dotCoverage) + 204 * dotCoverage);
        b = Math.round(b * (1 - dotCoverage) + 21 * dotCoverage);
      }

      if (watching) {
        [r, g, b, a] = paintStatusDot(r, g, b, a, vx, vy);
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const sizes = [16, 32, 48, 128];
// The "watching" variant marks tabs where early capture is enabled.
const variants = [
  { suffix: '', watching: false },
  { suffix: '-watching', watching: true },
];

for (const size of sizes) {
  for (const variant of variants) {
    const pngBuffer = generatePng(size, variant.watching);
    const filePath = path.join(outputDir, `icon${variant.suffix}-${size}.png`);
    fs.writeFileSync(filePath, pngBuffer);
    console.log(`Generated ${filePath} (${size}x${size}, ${pngBuffer.length} bytes)`);
  }
}
