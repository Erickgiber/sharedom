export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  color: string;
  width: number;
  points: StrokePoint[];
}

export interface AnnotatorLabels {
  done: string;
  cancel: string;
  undo: string;
  clear: string;
}

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ffffff', '#111116'];
const SIZES = [3, 6, 12];

export function drawStrokes(context: CanvasRenderingContext2D, strokes: Stroke[]): void {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const stroke of strokes) {
    const [first, ...rest] = stroke.points;
    if (!first) continue;

    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.beginPath();

    if (rest.length === 0) {
      context.arc(first.x, first.y, stroke.width / 2, 0, Math.PI * 2);
      context.fill();
      continue;
    }

    context.moveTo(first.x, first.y);
    for (let i = 0; i < rest.length - 1; i++) {
      const point = rest[i];
      const next = rest[i + 1];
      context.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    }
    const last = rest[rest.length - 1];
    context.lineTo(last.x, last.y);
    context.stroke();
  }

  context.restore();
}

export class ImageAnnotator {
  private root: HTMLElement | null = null;
  private settle: ((strokes: Stroke[] | null) => void) | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    private shadow: ShadowRoot,
    private labels: AnnotatorLabels
  ) {}

  public open(source: HTMLCanvasElement, initialStrokes: Stroke[]): Promise<Stroke[] | null> {
    this.close();

    let strokes = [...initialStrokes];
    let activeStroke: Stroke | null = null;
    let color = COLORS[0];
    let size = SIZES[1];
    let isRenderQueued = false;

    const root = document.createElement('div');
    root.className = 'sharedom-annotator';
    for (const type of ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup'] as const) {
      root.addEventListener(type, (e) => e.stopPropagation());
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'sharedom-annotator-canvas';
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');

    const render = () => {
      isRenderQueued = false;
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0);
      drawStrokes(context, activeStroke ? [...strokes, activeStroke] : strokes);
    };

    const queueRender = () => {
      if (isRenderQueued) return;
      isRenderQueued = true;
      requestAnimationFrame(render);
    };

    const toCanvasPoint = (e: PointerEvent): StrokePoint => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) * canvas.width) / rect.width,
        y: ((e.clientY - rect.top) * canvas.height) / rect.height,
      };
    };

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      activeStroke = { color, width: (size * canvas.width) / rect.width, points: [toCanvasPoint(e)] };
      queueRender();
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!activeStroke) return;
      activeStroke.points.push(toCanvasPoint(e));
      queueRender();
    });

    const finishStroke = () => {
      if (!activeStroke) return;
      strokes.push(activeStroke);
      activeStroke = null;
      queueRender();
    };
    canvas.addEventListener('pointerup', finishStroke);
    canvas.addEventListener('pointercancel', finishStroke);

    const undo = () => {
      strokes.pop();
      queueRender();
    };

    const toolbar = document.createElement('div');
    toolbar.className = 'sharedom-annotator-toolbar';

    const colorGroup = document.createElement('div');
    colorGroup.className = 'sharedom-annotator-group';
    for (const value of COLORS) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = `sharedom-annotator-color ${value === color ? 'active' : ''}`;
      swatch.style.background = value;
      swatch.setAttribute('aria-label', value);
      swatch.addEventListener('click', () => {
        color = value;
        colorGroup.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
        swatch.classList.add('active');
      });
      colorGroup.appendChild(swatch);
    }

    const sizeGroup = document.createElement('div');
    sizeGroup.className = 'sharedom-annotator-group';
    for (const value of SIZES) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = `sharedom-annotator-size ${value === size ? 'active' : ''}`;
      option.setAttribute('aria-label', `${value}px`);
      const dot = document.createElement('span');
      dot.style.width = `${value + 2}px`;
      dot.style.height = `${value + 2}px`;
      option.appendChild(dot);
      option.addEventListener('click', () => {
        size = value;
        sizeGroup.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
        option.classList.add('active');
      });
      sizeGroup.appendChild(option);
    }

    const createButton = (label: string, variant: 'secondary' | 'primary', onClick: () => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sharedom-btn sharedom-btn-${variant}`;
      button.textContent = label;
      button.addEventListener('click', onClick);
      return button;
    };

    const spacer = document.createElement('div');
    spacer.className = 'sharedom-annotator-spacer';

    toolbar.append(
      colorGroup,
      sizeGroup,
      createButton(this.labels.undo, 'secondary', undo),
      createButton(this.labels.clear, 'secondary', () => {
        strokes = [];
        queueRender();
      }),
      spacer,
      createButton(this.labels.cancel, 'secondary', () => this.finish(null)),
      createButton(this.labels.done, 'primary', () => this.finish(strokes))
    );

    const stage = document.createElement('div');
    stage.className = 'sharedom-annotator-stage';
    stage.appendChild(canvas);

    root.append(toolbar, stage);
    this.shadow.appendChild(root);
    this.root = root;
    render();

    this.keydownHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.stopPropagation();
        undo();
      }
    };
    window.addEventListener('keydown', this.keydownHandler, true);

    return new Promise((resolve) => {
      this.settle = resolve;
    });
  }

  public close(): void {
    this.finish(null);
  }

  private finish(strokes: Stroke[] | null): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler, true);
      this.keydownHandler = null;
    }
    this.root?.remove();
    this.root = null;

    const settle = this.settle;
    this.settle = null;
    settle?.(strokes);
  }
}
