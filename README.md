# sharedom

[![NPM Version](https://img.shields.io/npm/v/sharedom?color=blue)](https://www.npmjs.com/package/sharedom)
[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-sharedom-blue?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/sharedom-dom-screenshot-i/nnpbohgnnkkagbbfjeknpeokbppddjnm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Live_Demo-erickgiber.github.io%2Fsharedom-7c3aed)](https://erickgiber.github.io/sharedom/)

Fast, zero-dependency DOM snapshot, screenshot, and PDF capture library for the browser and SSR (Node.js, Next.js, SvelteKit).

**🌐 [Try the interactive playground &rarr;](https://erickgiber.github.io/sharedom/)** &nbsp;·&nbsp; capture, PDF export and telemetry demos running live in your browser.

> 🧩 **Available as both an NPM Library and an Official Chrome Extension:**
>
> - **[NPM Library (`sharedom`)](https://www.npmjs.com/package/sharedom)**: Full programmatic API for your web applications, dashboards, telemetry tools, or automated testing (Playwright/Puppeteer).
> - **[Chrome Extension (Web Store)](https://chromewebstore.google.com/detail/sharedom-dom-screenshot-i/nnpbohgnnkkagbbfjeknpeokbppddjnm)**: Interactive 1-click browser inspector to capture elements, console logs, and network traffic directly on any website without writing code.

---

## Features

- ⚡ **Lightweight & Fast**: Uses native browser APIs (`XMLSerializer`, SVG `foreignObject`, and `HTMLCanvasElement`).
- 📊 **DevTools & Telemetry Capture**: Capture Console Logs and Network Requests programmatically with status code coloring, HTTP methods, latency metrics, and rounded modern tables.
- 📑 **Smart Pagination & Multi-Page Archiving**: Automatically chunk large logs and network tables into compact, readable pages, and download them all as a single, zero-dependency `.zip` file or multi-page PDF.
- 📦 **Pure TypeScript ZIP Builder**: Built-in `buildZip` and `downloadZip` with CRC-32 calculation and zero external dependencies.
- 📄 **Pixel-Perfect PDF Generation**: Export elements to standard PDF 1.4 with preset page sizes (A4, Letter, A3, Auto), orientation, margins, and UTF-16BE metadata support with 0 external dependencies.
- 🖨️ **Direct Printing**: Instant native browser print dialog helper for any DOM element.
- 🌐 **SSR First-Class Support**: Dedicated `sharedom/ssr` module for Next.js Route Handlers, SvelteKit endpoints, and Node.js with built-in server-side PDF generation.
- 🎨 **Accurate Styles**: Automatically copies computed styles from source elements.
- 🔍 **High-DPI Support**: Configurable scale factor for crisp Retina / 4K snapshots.
- 🖼️ **Multiple Formats**: Export to PNG (with transparency), JPEG, WebP, PDF, or ZIP archives.
- 🚀 **Automatic Image Optimization**: Cleans transparent pixel entropy and sanitizes Base64 output automatically.
- 💾 **Built-in Downloader**: Helper functions to trigger instant image, PDF, or ZIP file downloads in the browser.
- 📦 **TypeScript First**: Full type definitions included out of the box for ESM and CJS.

---

## Installation

```bash
npm install sharedom
```

Or with your preferred package manager:

```bash
pnpm add sharedom
# or
yarn add sharedom
```

---

## Quick Start (Browser)

### 1. Capture as an Optimized Base64 Data URL

```typescript
import { capture } from 'sharedom';

// Capture by CSS selector
const dataUrl = await capture('#my-card', {
  scale: 2,
  format: 'png',
});

// Display in an <img> element
const imageElement = document.querySelector('img');
if (imageElement) imageElement.src = dataUrl;
```

### 1.1 What ends up in the image

`capture()` serializes a styled clone of the element, so a few things need explicit handling and are done for you:

| Content                             | Behaviour                                                                                                                                                                                                              |
| :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<canvas>`                          | The current bitmap is snapshotted into the capture, including when the canvas is the captured element itself. A tainted canvas, or WebGL without `preserveDrawingBuffer: true`, cannot be read back and is left blank. |
| `<video>`                           | The frame on screen is drawn into the capture.                                                                                                                                                                         |
| Same-origin and CORS-enabled images | Inlined as data URLs.                                                                                                                                                                                                  |
| Images blocked by CORS              | Not readable from the page. Install a `setImageResolver()` fallback (see the API reference) to let a privileged host fetch them.                                                                                       |
| Form state                          | `input`, `textarea` and `select` values, checked state and selection are carried over.                                                                                                                                 |
| Very large elements                 | Browsers silently fail past ~32k pixels per side. The scale is reduced to fit and a warning explains the new scale, instead of returning an empty image.                                                               |

---

### 2. Direct Download

```typescript
import { downloadCapture } from 'sharedom';

// Pass element reference or selector and filename
await downloadCapture('#my-card', 'card-snapshot.png', {
  scale: 2,
  backgroundColor: '#ffffff',
});
```

### 3. Capture & Export as PDF

```typescript
import { downloadPDF, capturePDF, printElement } from 'sharedom';

// 1. Direct PDF download with page presets and metadata
await downloadPDF('#invoice-card', 'invoice-2026.pdf', {
  pageSize: 'A4', // 'auto' | 'A4' | 'Letter' | 'A3' | 'A5' | 'Legal' | 'Tabloid'
  orientation: 'portrait', // 'portrait' | 'landscape'
  margin: 20, // margin in points (default: 0)
  scale: 2, // 2x Retina sharpness
  quality: 0.92, // JPEG stream quality
  title: 'Invoice INV-2026-0042',
  author: 'sharedom Studio',
  subject: 'Client Billing',
  keywords: ['invoice', 'billing', '2026'],
});

// 2. Obtain raw PDF Blob for custom iframe preview or uploading
const pdfBlob = await capturePDF('#report-table', {
  pageSize: 'Letter',
  orientation: 'landscape',
});
const previewUrl = URL.createObjectURL(pdfBlob);

// 3. Open browser print dialog for an element
await printElement('#invoice-card', { title: 'Invoice Print' });
```

### 4. Console Logs & Network Requests Capture (DevTools Telemetry)

Browsers cannot natively capture screenshots of the developer console or network tab. `sharedom` solves this by listening to telemetry events internally and rendering them into pixel-perfect, dark-themed, rounded cards ready for PNG, JPEG, WebP, multi-page PDF, or `.zip` export.

> 💡 **Both the `sharedom` NPM library and the Chrome Extension support full Console and Network captures!**

**What the trackers record:**

| Source                                                 | Recorded as                                                        |
| :----------------------------------------------------- | :----------------------------------------------------------------- |
| `console.log/info/warn/error/debug/trace/dir/table`    | A console entry with its level, repeat count and timestamp.        |
| Uncaught exceptions and unhandled rejections           | A console entry with level `error` and the original stack.         |
| `fetch()` and `XMLHttpRequest`                         | A network entry with method, status, type, duration and timestamp. |
| Responses with status `>= 400` or that never connected | An extra console `error`, rebuilt the way DevTools prints it.      |
| Images, scripts, stylesheets and the document itself   | A network entry built from Resource Timing.                        |
| Failed resources (`<img>`, `<script>`, `<link>`)       | A console `error` (`Failed to load resource: …`).                  |

> ⚠️ Chrome prints failed requests (`GET /api/x 404 (Not Found)`) from the browser itself, **not** through `console.error`, so no JavaScript hook can ever observe them. `sharedom` rebuilds those lines from the network layer, which is why they appear in the captured console table.
>
> Because Resource Timing entries are replayed when capture starts, calling `startNetworkCapture()` after the page loaded still recovers the requests that already happened. Console output, on the other hand, only exists from the moment `startConsoleCapture()` runs.

```typescript
import {
  startConsoleCapture,
  startNetworkCapture,
  captureConsoleLogs,
  captureConsoleLogsPages,
  downloadConsoleLogs,
  downloadConsoleLogsPDF,
  captureNetworkRequests,
  captureNetworkRequestsPages,
  downloadNetworkRequests,
  downloadNetworkRequestsPDF,
  buildZip,
  downloadZip,
  setLanguage,
} from 'sharedom';

// 1. Configure language (optional, supports 'en' | 'es', default: 'en')
setLanguage('es');

// 2. Start telemetry trackers (or pass custom entries via options)
startConsoleCapture();
startNetworkCapture();

// --- CONSOLE LOGS ---

// Single-card capture (up to maxEntries)
const logImage = await captureConsoleLogs({
  language: 'es',
  scale: 2,
  format: 'png',
});

// Paginated capture: automatically splits large logs into pages (default 15 per page)
const logPages = await captureConsoleLogsPages({
  entriesPerPage: 15,
  scale: 2,
});

// Download image: automatically downloads a .zip if multiple pages exist!
await downloadConsoleLogs('my-console-logs.png');

// Export as formatted multi-page PDF document
await downloadConsoleLogsPDF('my-console-logs.pdf', {
  entriesPerPage: 15,
  pageSize: 'A4',
});

// --- NETWORK REQUESTS ---

// Single-card capture (endpoint, HTTP status color, method, duration, timestamp)
const netImage = await captureNetworkRequests({ language: 'en' });

// Paginated capture: automatically splits requests into pages (default 12 per page)
const netPages = await captureNetworkRequestsPages({
  entriesPerPage: 12,
  scale: 2,
});

// Download image: automatically downloads a .zip if multiple pages exist!
await downloadNetworkRequests('my-network-requests.png');

// Export as formatted multi-page PDF document
await downloadNetworkRequestsPDF('my-network-requests.pdf', {
  entriesPerPage: 12,
  pageSize: 'A4',
});

// --- STANDALONE ZERO-DEPENDENCY ZIP GENERATOR ---

// Package any array of images or buffers into a native PKZip archive:
const zipBytes = buildZip([
  { name: 'part-1.png', data: logPages[0] },
  { name: 'part-2.png', data: logPages[1] },
]);

// Or trigger instant browser download:
downloadZip(
  [
    { name: 'log-1.png', data: logPages[0] },
    { name: 'log-2.png', data: logPages[1] },
  ],
  'all-captures.zip'
);
```

### 5. Automated QA with Playwright & Puppeteer (`sharedom/testing`)

`sharedom/testing` installs the console and network trackers in the page **before it loads**, and gives the test process a small session API to read, render or assert on everything the browser did. It works with Playwright and Puppeteer without any extra dependency, and needs no build step in your project.

```typescript
import { test, expect } from '@playwright/test';
import { attachShareDOM, dataUrlToBytes } from 'sharedom/testing';
import { writeFileSync } from 'node:fs';

test('checkout flow is clean', async ({ page }) => {
  // Attach BEFORE navigating so the very first byte is recorded.
  const sharedom = await attachShareDOM(page);

  await page.goto('https://example.com/checkout');
  await page.getByRole('button', { name: 'Pay' }).click();

  // Fails with a full report listing every console error and failed request.
  await sharedom.assertNoErrors();
  await sharedom.assertNoFailedRequests();
});
```

With Puppeteer the only difference is where the page comes from:

```typescript
import puppeteer from 'puppeteer';
import { attachShareDOM } from 'sharedom/testing';

const browser = await puppeteer.launch();
const page = await browser.newPage();

const sharedom = await attachShareDOM(page);
await page.goto('https://example.com');

console.log(await sharedom.report());
await browser.close();
```

**Attaching agents and CI artifacts.** `report()` returns a compact text summary designed to be pasted into an issue or handed to an AI agent, and the capture helpers return the same PNG cards the extension produces:

```typescript
const sharedom = await attachShareDOM(page);
await page.goto('https://example.com');

// Plain text summary: counts, console errors and failed requests.
const summary = await sharedom.report();

// Pixel-perfect PNG cards (one data URL per page of entries).
const [consoleCard] = await sharedom.captureConsoleImages({ scale: 2, language: 'en' });
const [networkCard] = await sharedom.captureNetworkImages({ entriesPerPage: 12 });

writeFileSync('console.png', dataUrlToBytes(consoleCard));
writeFileSync('network.png', dataUrlToBytes(networkCard));

// Raw structured data, e.g. to assert on a single request.
const requests = await sharedom.getRequests();
expect(requests.find((req) => req.url.includes('/api/cart'))?.status).toBe(200);
```

In a Playwright reporter or fixture, the same cards can be attached to the HTML report:

```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'passed') return;
  const [card] = await sharedom.captureNetworkImages();
  await testInfo.attach('network.png', { body: Buffer.from(dataUrlToBytes(card)), contentType: 'image/png' });
});
```

> `attachShareDOM()` also installs the tracker in the document that is already open, so attaching after `goto()` still recovers the network history through Resource Timing. Console entries, however, require attaching first.

---

## 📦 NPM Library vs Chrome Extension

| Feature                      | `sharedom` (NPM Library)                                 | ShareDOM (Chrome Extension)                                                                                             |
| ---------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Environment**              | Web Apps, Dashboards, Next.js, Node.js                   | Any website via Chrome toolbar                                                                                          |
| **Usage Mode**               | Programmatic TypeScript / JavaScript API                 | Interactive 1-click UI with Shadow DOM                                                                                  |
| **DOM Element Capture**      | `capture('#id')`, `downloadCapture()`                    | Hover element, click to capture                                                                                         |
| **Console Logs Capture**     | `captureConsoleLogs()`, `downloadConsoleLogs()`          | Dedicated button in popup & modal                                                                                       |
| **Network Requests Capture** | `captureNetworkRequests()`, `downloadNetworkRequests()`  | Dedicated button in popup & modal                                                                                       |
| **Smart Pagination**         | `capture*Pages({ entriesPerPage })`                      | Live navigation arrows & preview                                                                                        |
| **Multi-page PDF Export**    | `downloadConsoleLogsPDF()`, `capturePDF()`               | Dedicated "PDF" button                                                                                                  |
| **Multi-page ZIP Download**  | Automatic `.zip` when pages > 1 (`downloadZip`)          | Automatic `.zip` when pages > 1                                                                                         |
| **Zero Dependencies**        | 0 external runtime dependencies                          | 0 external runtime dependencies                                                                                         |
| **Availability**             | [npm i sharedom](https://www.npmjs.com/package/sharedom) | [Chrome Web Store](https://chromewebstore.google.com/detail/sharedom-dom-screenshot-i/nnpbohgnnkkagbbfjeknpeokbppddjnm) |

---

## Server-Side Rendering (SSR)

### 1. Sending HTML from Client (`fetch` POST)

```typescript
// Extract HTML from the DOM or provide raw HTML template
const card = document.querySelector('#my-card');
const html = card ? card.outerHTML : '<div class="banner">Hello World</div>';

// Send JSON payload with stringified HTML
const response = await fetch('/api/screenshot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ html }),
});

// Receive image blob and create an Object URL
const blob = await response.blob();
const imageUrl = URL.createObjectURL(blob);
```

### 2. Next.js App Router (Route Handler)

```typescript
// app/api/screenshot/route.ts
import { captureSSR } from 'sharedom/ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { html } = await request.json();

  const buffer = await captureSSR(html, {
    scale: 2,
    format: 'png',
    viewport: { width: 1200, height: 630 },
  });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
```

### 3. SvelteKit Server Endpoint

```typescript
// src/routes/api/screenshot/+server.ts
import { captureSSR } from 'sharedom/ssr';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { html } = await request.json();

  const buffer = await captureSSR(html, {
    scale: 2,
    format: 'png',
    viewport: { width: 1200, height: 630 },
  });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
    },
  });
};
```

### 4. Next.js App Router: PDF Route Handler (Zero-Dependency)

```typescript
// app/api/pdf/route.ts
import { createPdfFromImageSSR } from 'sharedom/ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { image, title, author } = await request.json();

  // Generates PDF 1.4 Uint8Array directly from image bytes or Data URL
  const pdfBytes = createPdfFromImageSSR(image, {
    pageSize: 'A4',
    orientation: 'portrait',
    margin: 28,
    title: title || 'Server Document',
    author: author || 'sharedom',
  });

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="document.pdf"',
    },
  });
}
```

---

## API Reference

### Client: `sharedom`

#### `capture(target, options?)`

Captures a DOM element and returns a Promise resolving to an optimized base64 Data URL.

- **`target`** (`string | HTMLElement`): The CSS selector or HTMLElement to capture.
- **`options`** (`CaptureOptions`, optional): Configuration options.

#### `downloadCapture(target, filename?, options?)`

Captures a DOM element and triggers a browser download.

- **`target`** (`string | HTMLElement`): The CSS selector or HTMLElement to capture.
- **`filename`** (`string`, optional, default: `'screenshot.png'`): The name of the downloaded file.
- **`options`** (`CaptureOptions`, optional): Configuration options.

#### `CaptureOptions`

| Option            | Type                        | Default          | Description                                                         |
| :---------------- | :-------------------------- | :--------------- | :------------------------------------------------------------------ |
| `scale`           | `number`                    | `1`              | Resolution multiplier (e.g. `2` for 2x scale).                      |
| `backgroundColor` | `string`                    | `undefined`      | Background fill color. Transparent by default.                      |
| `format`          | `'png' \| 'jpeg' \| 'webp'` | `'png'`          | Output image format.                                                |
| `quality`         | `number`                    | `0.92`           | Compression quality for JPEG/WebP (between `0` and `1`).            |
| `optimize`        | `boolean`                   | `true`           | Automatically clean transparent entropy and optimize Base64 output. |
| `width`           | `number`                    | `element.width`  | Custom target width in pixels.                                      |
| `height`          | `number`                    | `element.height` | Custom target height in pixels.                                     |
| `language`        | `'en' \| 'es'`              | `'en'`           | Language for table headings, badges, and status labels.             |

#### `downloadPDF(target, filename?, options?)`

Captures a DOM element and triggers a direct PDF file download in the browser.

- **`target`** (`string | HTMLElement`): The CSS selector or HTMLElement to capture.
- **`filename`** (`string`, optional, default: `'capture.pdf'`): The name of the downloaded PDF file.
- **`options`** (`PdfOptions`, optional): Configuration options for the PDF document.

#### `capturePDF(target, options?)`

Captures a DOM element and returns a Promise resolving to a PDF `Blob`.

- **`target`** (`string | HTMLElement`): The CSS selector or HTMLElement to capture.
- **`options`** (`PdfOptions`, optional): Configuration options for the PDF document.

#### `printElement(target, options?)`

Opens the browser's native print dialog for the selected element in a hidden iframe.

- **`target`** (`string | HTMLElement`): The CSS selector or HTMLElement to print.
- **`options`** (`Pick<PdfOptions, 'scale' | 'quality' | 'backgroundColor' | 'title'>`, optional): Print configuration.

#### `PdfOptions`

| Option            | Type                                                                 | Default      | Description                                                                   |
| :---------------- | :------------------------------------------------------------------- | :----------- | :---------------------------------------------------------------------------- |
| `pageSize`        | `'auto' \| 'A4' \| 'Letter' \| 'A3' \| 'A5' \| 'Legal' \| 'Tabloid'` | `'auto'`     | PDF page preset size. `'auto'` fits page exactly to element dimensions.       |
| `orientation`     | `'portrait' \| 'landscape'`                                          | `'portrait'` | Page orientation (applicable when `pageSize` is not `'auto'`).                |
| `margin`          | `number`                                                             | `0`          | Margin around the content in points (`1 pt = 1/72 inch`).                     |
| `scale`           | `number`                                                             | `2`          | Rendering scale factor for crisp Retina/High-DPI output.                      |
| `quality`         | `number`                                                             | `0.92`       | JPEG stream compression quality (between `0` and `1`).                        |
| `backgroundColor` | `string`                                                             | `'#ffffff'`  | Background fill color of the page.                                            |
| `title`           | `string`                                                             | `undefined`  | PDF Document title in `/Info` dictionary (supports UTF-16BE Spanish/Unicode). |
| `author`          | `string`                                                             | `undefined`  | PDF Document author.                                                          |
| `subject`         | `string`                                                             | `undefined`  | PDF Document subject.                                                         |
| `keywords`        | `string \| string[]`                                                 | `undefined`  | PDF Document keywords.                                                        |
| `language`        | `'en' \| 'es'`                                                       | `'en'`       | Language for table headings, badges, and status labels.                       |

#### `captureConsoleLogs(options?)` / `downloadConsoleLogs(filename?, options?)`

Renders intercepted or provided console logs into a sleek rounded table and exports as a Base64 Data URL or triggers a direct image download.

#### `captureConsoleLogsPDF(options?)` / `downloadConsoleLogsPDF(filename?, options?)`

Renders console logs into a styled table and exports directly to a PDF `Blob` or triggers a PDF file download.

#### `captureNetworkRequests(options?)` / `downloadNetworkRequests(filename?, options?)`

Captures HTTP requests with method, endpoint name, full URL, status code, duration, and timestamp into an image.

#### `captureNetworkRequestsPDF(options?)` / `downloadNetworkRequestsPDF(filename?, options?)`

Captures HTTP requests and exports as a PDF document.

#### `setLanguage(lang)` / `getLanguage()`

Configures the global library language for generated tables and metadata. Supported codes: `'en'`, `'es'`, `'zh'`, `'ja'`, `'pt'`, `'de'`, `'ko'`, `'ru'`.

#### `setImageResolver(resolver)`

Installs a fallback used when the page itself is not allowed to read an image (CORS without `Access-Control-Allow-Origin`). The resolver receives the image URL and returns a data URL, or `null` to give up. A browser extension or a proxy can fetch what the page cannot:

```typescript
import { setImageResolver } from 'sharedom';

setImageResolver(async (url) => {
  const response = await myPrivilegedFetch(url);
  return response ?? null;
});
```

#### `snapshotMediaElement(element)`

Returns an `<img>` reproducing the current frame of a `<canvas>` or `<video>`, or `null` when the browser will not expose those pixels (a tainted canvas, or WebGL without `preserveDrawingBuffer`). Called automatically by `capture()`.

---

### SSR: `sharedom/ssr`

#### `captureSSR(htmlOrUrl, options?)`

Captures an HTML string or URL on the server and returns a `Promise<Uint8Array>` containing the SVG foreignObject markup.

#### `createSsrSnapshot(htmlOrUrl, options?)`

Creates an SSR snapshot and returns it as a Base64 Data URL (`data:image/svg+xml;base64,...`).

#### `createPdfFromImageSSR(image, options?)`

Generates a valid PDF 1.4 binary (`Uint8Array`) on the server with **zero native dependencies**.

- **`image`** (`Uint8Array | string`): Raw JPEG `Uint8Array` bytes or a Base64 Data URL (`data:image/jpeg;base64,...`). Auto-detects pixel width and height from JPEG SOF markers.
- **`options`** (`SsrPdfOptions`, optional): PDF build options (`pageSize`, `orientation`, `margin`, `title`, `author`, `keywords`, `dpi`).

#### `buildPdf(jpegBytes, options)`

Low-level, pure TypeScript zero-dependency PDF 1.4 binary builder.

- **`jpegBytes`** (`Uint8Array`): Raw JPEG byte stream.
- **`options`** (`PdfBuildOptions`): Detailed page dimensions, image pixel size, metadata, and margins.

#### `getJpegDimensions(bytes)`

Parses JPEG SOF (Start of Frame) segment markers according to ISO/IEC 10918-1 and returns `{ width: number, height: number }` without external libraries.

#### `SsrCaptureOptions`

| Option            | Type                                 | Default                        | Description                              |
| :---------------- | :----------------------------------- | :----------------------------- | :--------------------------------------- |
| `viewport`        | `{ width: number, height: number }`  | `{ width: 1200, height: 630 }` | Viewport dimensions.                     |
| `scale`           | `number`                             | `2`                            | Device pixel ratio / scale.              |
| `format`          | `'svg' \| 'png' \| 'jpeg' \| 'webp'` | `'svg'`                        | Output format MIME.                      |
| `backgroundColor` | `string`                             | `'#ffffff'`                    | Background fill color.                   |
| `delay`           | `number`                             | `0`                            | Delay in milliseconds before capture.    |
| `styles`          | `string`                             | `''`                           | Custom CSS stylesheet injected into SVG. |

---

### Testing: `sharedom/testing`

#### `attachShareDOM(page)`

Installs the tracker in a Playwright or Puppeteer `Page` at document start and resolves to a `ShareDOMTestSession`. Call it **before** `page.goto()` to record console output from the first byte.

- **`page`** (`AutomationPage`): Any object exposing `evaluate()` plus `addInitScript()` (Playwright) or `evaluateOnNewDocument()` (Puppeteer).

#### `ShareDOMTestSession`

| Method                           | Returns                          | Description                                                          |
| :------------------------------- | :------------------------------- | :------------------------------------------------------------------- |
| `getLogs()`                      | `Promise<ConsoleLogEntry[]>`     | Every console entry, ordered by timestamp.                           |
| `getErrors()`                    | `Promise<ConsoleLogEntry[]>`     | Only entries with level `error`, including rebuilt request failures. |
| `getRequests()`                  | `Promise<NetworkRequestEntry[]>` | Every request seen through fetch, XHR and Resource Timing.           |
| `getFailedRequests()`            | `Promise<NetworkRequestEntry[]>` | Requests with status `0` or `>= 400`.                                |
| `clear()`                        | `Promise<void>`                  | Drops everything recorded so far, e.g. between test steps.           |
| `captureConsoleImages(options?)` | `Promise<string[]>`              | Console cards as PNG data URLs (`ConsoleCaptureOptions`).            |
| `captureNetworkImages(options?)` | `Promise<string[]>`              | Network cards as PNG data URLs (`NetworkCaptureOptions`).            |
| `report()`                       | `Promise<string>`                | Text summary with counts, console errors and failed requests.        |
| `assertNoErrors()`               | `Promise<void>`                  | Throws with the full report when any console error was recorded.     |
| `assertNoFailedRequests()`       | `Promise<void>`                  | Throws with the full report when any request failed.                 |

#### `dataUrlToBytes(dataUrl)`

Decodes a `data:` URL returned by the capture helpers into a `Uint8Array`, ready for `writeFileSync()` or `testInfo.attach()`.

#### `formatReport(logs, requests)`

Pure function building the same text summary as `report()` from entries you already have.

> A cross-origin response that does not send `Timing-Allow-Origin` hides its status and HTTP verb from the page. Those entries are reported with `—` and are counted as neither successful nor failed.

---

## Development & Live Preview

The repository includes an interactive playground to test all options in real time.

```bash
# Install dependencies
npm install

# Start real-time dev server with live preview
npm run dev

# Build library dist (Client & SSR)
npm run build

# Build Chrome Extension
npm run build:extension

# Build static preview for GitHub Pages
npm run build:preview

# Run the Playwright suite (library, sharedom/testing and extension bundle)
npm test
```

---

## 🧩 Chrome Extension

`sharedom` includes a built-in Chrome Extension in `extension/` for interactive DOM inspection and one-click capture:

- **Interactive Hover & Highlight**: Highlights elements with tags, classes, and pixel dimensions.
- **Copy & Download**: Copy PNG images directly to the clipboard or download in high resolution (1x, 2x, 3x).
- **Keyboard Navigation**: Use `↑` for parent element, `↓` for child, `Esc` to cancel.
- **Shortcuts**: Press `Alt + Shift + S` (`Cmd + Shift + S` on macOS) to activate.
- **Console & Network Capture**: Export the console and the HTTP request table as images, PDF or ZIP.
- **Capture From Page Load** (per-site opt-in): The extension normally injects its tracker when you open the popup, so console output produced while the page was loading is already gone. Enabling the toggle for a site grants an optional host permission and registers the tracker as a `document_start` script for that origin only. Network history is recovered from Resource Timing either way.
- **Watching Indicator**: While the active tab belongs to a site with early capture enabled, the toolbar icon shows a green dot in its corner, and the popup explains the color in the selected language.
- **Screen Recorder**: Records a tab, a window or the whole screen from inside the popup — no separate window. Frame rate up to unlimited, quality presets, WebM (default, live size and disk streaming) or MP4, optional microphone, and a small ShareDOM badge burned into the corner of every frame. The recording keeps going while the popup is closed (the toolbar icon shows `REC`), and reopening the popup returns to the recorder with the elapsed time and file size. Chunks are buffered on disk, so a one hour session uses the same memory as a ten second one. Shortcut: `Alt + Shift + R`.
- **Eight Languages**: English, Spanish, Chinese, Japanese, Portuguese, German, Korean and Russian, switchable from a flag picker in the popup.
- **Release Notes**: After an update, the first popup shows what changed in that version, translated, once.

See the [Extension README](file:///Users/erickgiber/Documents/Repositories/sharedom/extension/README.md) for step-by-step installation instructions in `chrome://extensions`.

---

## License

MIT
