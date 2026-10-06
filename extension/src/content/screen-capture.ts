import type { CaptureVisibleTabResponse } from '../global';

export type ScreenCaptureFailure = 'too-large' | 'unavailable';

export class ScreenCaptureError extends Error {
  constructor(
    readonly reason: ScreenCaptureFailure,
    message: string
  ) {
    super(message);
  }
}

export interface ScreenCapture {
  canvas: HTMLCanvasElement;
  /** Screen pixels per CSS pixel: devicePixelRatio times page zoom. */
  pixelRatio: number;
}

/** The first callback runs before the style change is painted, the second after that frame. */
function afterNextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

function isInsideViewport(rect: DOMRect, viewportWidth: number, viewportHeight: number): boolean {
  return rect.left >= 0 && rect.top >= 0 && rect.right <= viewportWidth && rect.bottom <= viewportHeight;
}

async function requestVisibleTab(): Promise<string> {
  const response: CaptureVisibleTabResponse | undefined = await chrome.runtime.sendMessage({
    type: 'SHAREDOM_CAPTURE_VISIBLE_TAB',
  });
  if (!response || !('dataUrl' in response)) {
    throw new ScreenCaptureError('unavailable', response?.error ?? 'No response from the extension.');
  }
  return response.dataUrl;
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
    throw new ScreenCaptureError('too-large', `${Math.round(initial.width)}x${Math.round(initial.height)}px`);
  }
  if (!isInsideViewport(initial, viewportWidth, viewportHeight)) {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }

  // Opacity keeps the overlay under the pointer, so the page does not switch to :hover styles.
  const previousOpacity = overlayHost.style.getPropertyValue('opacity');
  const previousPriority = overlayHost.style.getPropertyPriority('opacity');
  overlayHost.style.setProperty('opacity', '0', 'important');

  let screenshot: string;
  let rect: DOMRect;
  try {
    await afterNextPaint();
    rect = element.getBoundingClientRect();
    screenshot = await requestVisibleTab();
  } finally {
    overlayHost.style.setProperty('opacity', previousOpacity, previousPriority);
  }

  const image = new Image();
  image.src = screenshot;
  await image.decode();

  const pixelRatio = image.naturalWidth / window.innerWidth;
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const width = Math.min(rect.right, viewportWidth) - left;
  const height = Math.min(rect.bottom, viewportHeight) - top;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const context = canvas.getContext('2d');
  if (!context) throw new ScreenCaptureError('unavailable', 'Could not obtain a 2D canvas context.');

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
