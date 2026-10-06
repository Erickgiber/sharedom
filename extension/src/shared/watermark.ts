const WATERMARK_TEXT = 'ShareDOM';
const MARGIN_RATIO = 0.022;
const HEIGHT_RATIO = 0.038;
const MIN_HEIGHT = 22;
const MAX_HEIGHT = 56;

type Canvas2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface WatermarkBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function badgeMetrics(context: Canvas2D, width: number, height: number, withLogo: boolean) {
  const badgeHeight = Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, height * HEIGHT_RATIO)));
  const margin = Math.round(Math.min(width, height) * MARGIN_RATIO);
  const padding = Math.round(badgeHeight * 0.3);
  const iconSize = Math.round(badgeHeight * 0.62);
  const iconGap = Math.round(padding * 0.6);
  const fontSize = Math.round(badgeHeight * 0.42);

  context.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const textWidth = context.measureText(WATERMARK_TEXT).width;
  const badgeWidth = padding * 2 + (withLogo ? iconSize + iconGap : 0) + textWidth;

  return {
    padding,
    iconSize,
    iconGap,
    box: {
      x: width - margin - badgeWidth,
      y: height - margin - badgeHeight,
      width: badgeWidth,
      height: badgeHeight,
    },
  };
}

/**
 * Small translucent badge pinned to the bottom right corner. It is sized relative to the frame so
 * it stays readable at 720p and discreet at 4K, and it never reaches the centre of the picture.
 */
export function drawWatermark(
  context: Canvas2D,
  width: number,
  height: number,
  logo: CanvasImageSource | null
): WatermarkBox {
  const { padding, iconSize, iconGap, box } = badgeMetrics(context, width, height, logo !== null);

  context.save();
  context.textBaseline = 'middle';
  context.globalAlpha = 0.62;
  context.fillStyle = '#0c0c0f';
  context.beginPath();
  context.roundRect(box.x, box.y, box.width, box.height, box.height / 2);
  context.fill();

  context.globalAlpha = 0.92;
  if (logo) {
    context.drawImage(logo, box.x + padding, box.y + (box.height - iconSize) / 2, iconSize, iconSize);
  }

  context.fillStyle = '#ffffff';
  context.fillText(
    WATERMARK_TEXT,
    box.x + padding + (logo ? iconSize + iconGap : 0),
    box.y + box.height / 2 + 1
  );
  context.restore();

  return box;
}
