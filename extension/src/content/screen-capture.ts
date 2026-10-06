import type { CaptureVisibleTabResponse } from '../global';

export interface ScreenCapture {
  canvas: HTMLCanvasElement;
  /** Screen pixels per CSS pixel: devicePixelRatio times page zoom. */
  pixelRatio: number;
}

const VIEWPORT_TOLERANCE_PX = 1;

/** The first callback runs before the style change is painted, the second after that frame. */
function afterNextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

function isInsideViewport(rect: DOMRect, viewportWidth: number, viewportHeight: number): boolean {
  return (
    rect.left >= -VIEWPORT_TOLERANCE_PX &&
    rect.top >= -VIEWPORT_TOLERANCE_PX &&
    rect.right <= viewportWidth + VIEWPORT_TOLERANCE_PX &&
    rect.bottom <= viewportHeight + VIEWPORT_TOLERANCE_PX
  );
}

async function requestVisibleTab(): Promise<string> {
  const response: CaptureVisibleTabResponse | undefined = await chrome.runtime.sendMessage({
    type: 'SHAREDOM_CAPTURE_VISIBLE_TAB',
  });
  if (!response || !('dataUrl' in response)) {
    throw new Error(response?.error ?? 'No response from the extension.');
  }
  return response.dataUrl;
}

async function captureRegion(readRegion: () => DOMRect, overlayHost: HTMLElement): Promise<ScreenCapture> {
  // Opacity keeps the overlay under the pointer, so the page does not switch to :hover styles.
  const previousOpacity = overlayHost.style.getPropertyValue('opacity');
  const previousPriority = overlayHost.style.getPropertyPriority('opacity');
  overlayHost.style.setProperty('opacity', '0', 'important');

  let screenshot: string;
  let rect: DOMRect;
  try {
    await afterNextPaint();
    rect = readRegion();
    screenshot = await requestVisibleTab();
  } finally {
    overlayHost.style.setProperty('opacity', previousOpacity, previousPriority);
  }

  const image = new Image();
  image.src = screenshot;
  await image.decode();

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const pixelRatio = image.naturalWidth / viewportWidth;
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const width = Math.min(rect.right, viewportWidth) - left;
  const height = Math.min(rect.bottom, viewportHeight) - top;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const context = canvas.getContext('2d');
  if (!context || canvas.width <= 0 || canvas.height <= 0) {
    throw new Error('The selected region has no visible pixels.');
  }

  context.drawImage(
    image,
    Math.round(left * pixelRatio),
    Math.round(top * pixelRatio),
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return { canvas, pixelRatio };
}

/**
 * Reads the element exactly as the browser composited it, through chrome.tabs.captureVisibleTab:
 * cross-origin iframes, WebGL, video and backdrop filters included. Only what fits in the viewport
 * can be read, at the resolution of the screen.
 */
export async function captureElementFromScreen(element: HTMLElement, overlayHost: HTMLElement): Promise<ScreenCapture> {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  const initial = element.getBoundingClientRect();
  if (initial.width > viewportWidth || initial.height > viewportHeight) {
    throw new Error('The element is larger than the viewport.');
  }
  if (!isInsideViewport(initial, viewportWidth, viewportHeight)) {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }

  return captureRegion(() => {
    const rect = element.getBoundingClientRect();
    if (!isInsideViewport(rect, viewportWidth, viewportHeight)) {
      throw new Error('The element cannot be brought fully into the viewport.');
    }
    return rect;
  }, overlayHost);
}

export function captureAreaFromScreen(area: DOMRect, overlayHost: HTMLElement): Promise<ScreenCapture> {
  return captureRegion(() => area, overlayHost);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the capture.'))), 'image/png');
  });
}

export async function copyCaptureToClipboard(capture: Promise<ScreenCapture>): Promise<boolean> {
  const blob = capture.then(({ canvas }) => canvasToPngBlob(canvas));
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}
