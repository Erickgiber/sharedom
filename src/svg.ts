import { getDocumentFontStyles } from './styles';

export function createSvgDataUrl(element: HTMLElement, width: number, height: number): string {
    const serializedHtml = new XMLSerializer().serializeToString(element);
    const fontStyles = getDocumentFontStyles();

    const styleBlock = fontStyles ? `<style><![CDATA[\n${fontStyles}\n]]></style>` : '';

    const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;">
          ${styleBlock}
          ${serializedHtml}
        </div>
      </foreignObject>
    </svg>
  `;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}
