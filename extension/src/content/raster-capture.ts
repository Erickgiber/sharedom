import { capture, CaptureClip } from '../../../src/index';
import { ScreenCapture, captureElementFromScreen } from './screen-capture';

export interface RenderSource {
  element: HTMLElement;
  clip?: CaptureClip;
}

const PROBE_INSET_PX = 1;

function isTransparentColor(color: string): boolean {
  return !color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)' || color.endsWith(', 0)');
}

export function detectBackgroundColor(element: HTMLElement): string | undefined {
  let current: HTMLElement | null = element;
  while (current && current !== document.documentElement) {
    const color = window.getComputedStyle(current).backgroundColor;
    if (!isTransparentColor(color)) return color;
    current = current.parentElement;
  }

  const bodyColor = window.getComputedStyle(document.body).backgroundColor;
  return isTransparentColor(bodyColor) ? undefined : bodyColor;
}

async function decodeToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not obtain a 2D canvas context.');
  context.drawImage(image, 0, 0);
  return canvas;
}

export async function renderWithEngine(
  source: RenderSource,
  scale: number,
  backgroundColor: string | undefined
): Promise<ScreenCapture> {
  const dataUrl = await capture(source.element, {
    scale,
    format: 'png',
    backgroundColor,
    clip: source.clip,
    optimize: true,
  });
  const canvas = await decodeToCanvas(dataUrl);
  const cssWidth = source.clip?.width ?? source.element.getBoundingClientRect().width;
  return { canvas, pixelRatio: cssWidth > 0 ? canvas.width / cssWidth : scale };
}

export async function captureElementOriginal(element: HTMLElement, overlayHost: HTMLElement): Promise<ScreenCapture> {
  try {
    return await captureElementFromScreen(element, overlayHost);
  } catch {
    return renderWithEngine({ element }, window.devicePixelRatio, detectBackgroundColor(element));
  }
}

function pageElementAt(x: number, y: number, overlayHost: HTMLElement): HTMLElement | null {
  for (const hit of document.elementsFromPoint(x, y)) {
    if (hit === overlayHost || overlayHost.contains(hit)) continue;

    let element: Element | null = hit;
    while (element && !(element instanceof HTMLElement)) element = element.parentElement;
    if (element instanceof HTMLElement && element !== document.documentElement) return element;
  }
  return null;
}

function commonAncestor(elements: HTMLElement[]): HTMLElement {
  let ancestor: HTMLElement = elements[0] ?? document.body;
  while (ancestor !== document.body && !elements.every((element) => ancestor.contains(element))) {
    ancestor = ancestor.parentElement ?? document.body;
  }
  return ancestor;
}

function containsRect(outer: DOMRect, inner: DOMRect): boolean {
  return (
    outer.left <= inner.left && outer.top <= inner.top && outer.right >= inner.right && outer.bottom >= inner.bottom
  );
}

export function areaRenderSource(area: DOMRect, overlayHost: HTMLElement): RenderSource {
  const left = area.left + PROBE_INSET_PX;
  const top = area.top + PROBE_INSET_PX;
  const right = area.right - PROBE_INSET_PX;
  const bottom = area.bottom - PROBE_INSET_PX;
  const probes: Array<[number, number]> = [
    [left, top],
    [right, top],
    [left, bottom],
    [right, bottom],
    [(left + right) / 2, (top + bottom) / 2],
  ];

  const hits = probes
    .map(([x, y]) => pageElementAt(x, y, overlayHost))
    .filter((element): element is HTMLElement => element !== null);

  let container = commonAncestor(hits);
  while (container !== document.body && !containsRect(container.getBoundingClientRect(), area)) {
    container = container.parentElement ?? document.body;
  }

  const bounds = container.getBoundingClientRect();
  return {
    element: container,
    clip: {
      x: area.left - bounds.left,
      y: area.top - bounds.top,
      width: area.width,
      height: area.height,
    },
  };
}
