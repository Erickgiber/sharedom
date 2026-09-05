function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function highlightCode(code: string): string {
  const lines = code.split('\n');

  return lines
    .map((line, lineIndex) => {
      let highlighted = '';
      let i = 0;

      while (i < line.length) {
        if (line.slice(i, i + 2) === '//') {
          const comment = escapeHtml(line.slice(i));
          highlighted += `<span class="tok-comment">${comment}</span>`;
          break;
        }

        if (line[i] === "'" || line[i] === '"' || line[i] === '`') {
          const quote = line[i];
          let j = i + 1;
          while (j < line.length && line[j] !== quote) {
            if (line[j] === '\\') j++;
            j++;
          }
          j = Math.min(j + 1, line.length);
          const str = escapeHtml(line.slice(i, j));
          highlighted += `<span class="tok-string">${str}</span>`;
          i = j;
          continue;
        }

        if (/\d/.test(line[i]) && (i === 0 || /[\s,(:=[{+\-*/]/.test(line[i - 1]))) {
          let j = i;
          while (j < line.length && /[\d.]/.test(line[j])) {
            j++;
          }
          const num = escapeHtml(line.slice(i, j));
          highlighted += `<span class="tok-number">${num}</span>`;
          i = j;
          continue;
        }

        if (/[a-zA-Z_$]/.test(line[i])) {
          let j = i;
          while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) {
            j++;
          }
          const word = line.slice(i, j);

          const keywords = new Set([
            'import', 'from', 'export', 'default', 'const', 'let', 'var',
            'await', 'async', 'function', 'return', 'type', 'interface',
            'as', 'new', 'if', 'else', 'try', 'catch', 'finally'
          ]);

          const types = new Set([
            'CaptureOptions', 'SsrCaptureOptions', 'NextResponse', 'Response',
            'Request', 'RequestHandler', 'Uint8Array', 'Buffer', 'Promise',
            'HTMLElement', 'Record', 'string', 'number', 'boolean'
          ]);

          const funcs = new Set([
            'capture', 'downloadCapture', 'captureSSR', 'createSsrSnapshot',
            'log', 'json', 'querySelector', 'addEventListener', 'POST', 'GET'
          ]);

          if (keywords.has(word)) {
            highlighted += `<span class="tok-keyword">${word}</span>`;
          } else if (types.has(word)) {
            highlighted += `<span class="tok-type">${word}</span>`;
          } else if (funcs.has(word) || (j < line.length && line[j] === '(')) {
            highlighted += `<span class="tok-func">${word}</span>`;
          } else if (j < line.length && line[j] === ':') {
            highlighted += `<span class="tok-prop">${word}</span>`;
          } else {
            highlighted += `<span class="tok-ident">${word}</span>`;
          }

          i = j;
          continue;
        }

        highlighted += escapeHtml(line[i]);
        i++;
      }

      return `<div class="code-row"><span class="line-no">${lineIndex + 1}</span><span class="line-code">${highlighted || ' '}</span></div>`;
    })
    .join('');
}
