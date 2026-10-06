const MIN_AREA_SIZE_PX = 4;

export class AreaSelector {
  private layer: HTMLElement | null = null;
  private settle: ((area: DOMRect | null) => void) | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    private shadow: ShadowRoot,
    private hintText: string
  ) {}

  public select(): Promise<DOMRect | null> {
    this.cancel();

    const layer = document.createElement('div');
    layer.className = 'sharedom-area-layer';

    const hint = document.createElement('div');
    hint.className = 'sharedom-area-hint';
    hint.textContent = this.hintText;

    const selection = document.createElement('div');
    selection.className = 'sharedom-area-selection sharedom-hidden';

    const sizeLabel = document.createElement('span');
    sizeLabel.className = 'sharedom-area-size';
    selection.appendChild(sizeLabel);

    layer.append(hint, selection);

    let origin: { x: number; y: number } | null = null;
    let area = new DOMRect();

    const updateSelection = (e: PointerEvent) => {
      if (!origin) return;
      const x = Math.min(Math.max(e.clientX, 0), window.innerWidth);
      const y = Math.min(Math.max(e.clientY, 0), window.innerHeight);
      area = new DOMRect(
        Math.min(origin.x, x),
        Math.min(origin.y, y),
        Math.abs(x - origin.x),
        Math.abs(y - origin.y)
      );
      selection.style.left = `${area.x}px`;
      selection.style.top = `${area.y}px`;
      selection.style.width = `${area.width}px`;
      selection.style.height = `${area.height}px`;
      sizeLabel.textContent = `${Math.round(area.width)} × ${Math.round(area.height)}`;
    };

    layer.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      layer.setPointerCapture(e.pointerId);
      origin = { x: e.clientX, y: e.clientY };
      layer.classList.add('is-selecting');
      selection.classList.remove('sharedom-hidden');
      hint.classList.add('sharedom-hidden');
      updateSelection(e);
    });

    layer.addEventListener('pointermove', (e) => {
      e.stopPropagation();
      updateSelection(e);
    });

    layer.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      if (!origin) return;
      origin = null;

      if (area.width < MIN_AREA_SIZE_PX || area.height < MIN_AREA_SIZE_PX) {
        layer.classList.remove('is-selecting');
        selection.classList.add('sharedom-hidden');
        hint.classList.remove('sharedom-hidden');
        return;
      }
      this.finish(area);
    });

    layer.addEventListener('pointercancel', () => this.finish(null));
    layer.addEventListener('click', (e) => e.stopPropagation());
    layer.addEventListener('contextmenu', (e) => e.preventDefault());

    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      this.finish(null);
    };
    window.addEventListener('keydown', this.keydownHandler, true);

    this.shadow.appendChild(layer);
    this.layer = layer;

    return new Promise((resolve) => {
      this.settle = resolve;
    });
  }

  public cancel(): void {
    this.finish(null);
  }

  private finish(area: DOMRect | null): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler, true);
      this.keydownHandler = null;
    }
    this.layer?.remove();
    this.layer = null;

    const settle = this.settle;
    this.settle = null;
    settle?.(area);
  }
}
