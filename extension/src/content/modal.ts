import {
  capture,
  downloadPDF,
  buildPdf,
  buildMultiPagePdf,
  downloadZip,
  ZipFileInput,
  CaptureOptions,
  PdfOptions,
} from '../../../src/index';
import { translations, ExtensionLanguage } from '../shared/i18n';
import { ScreenCapture, captureElementFromScreen } from './screen-capture';
import { ImageAnnotator, Stroke, drawStrokes } from './annotator';

type CaptureType = 'element' | 'console' | 'network' | 'area';

const SCREEN_EXPORT_QUALITY = 0.92;

export interface ModalOptions {
  scale: number;
  format: 'png' | 'jpeg' | 'webp';
  backgroundColor: string | undefined;
  language: ExtensionLanguage;
}

function rgbToHex(rgbStr: string): string {
  const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return '#6366f1';
  const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
  const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
  const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export class ActionModal {
  private shadow: ShadowRoot;
  private backdrop: HTMLElement | null = null;
  private currentElement: HTMLElement | null = null;
  private currentDataUrl = '';
  private detectedBgColor: string | undefined = undefined;
  private currentOptions: ModalOptions = {
    scale: 2,
    format: 'png',
    backgroundColor: undefined,
    language: 'en',
  };
  private isCapturing = false;
  private currentCaptureType: CaptureType = 'element';
  private chunkElements: HTMLElement[] = [];
  private chunkDataUrls: string[] = [];
  private currentPageIndex = 0;
  private totalPages = 1;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private idleTimer: number | null = null;
  private rawItems: any[] = [];
  private usesEngine = false;
  /** Read once per selection; changing the format only re-encodes it. */
  private screenCapture: ScreenCapture | null = null;
  private strokes: Stroke[] = [];
  private annotator: ImageAnnotator | null = null;
  private scaleButtons: HTMLElement | null = null;
  private backgroundGroup: HTMLElement | null = null;
  private session = 0;

  private onClose: () => void;
  private onReselect: () => void;
  private onToast: (msg: string, icon?: string) => void;

  constructor(
    shadow: ShadowRoot,
    callbacks: {
      onClose: () => void;
      onReselect: () => void;
      onToast: (msg: string, icon?: string) => void;
    },
    initialOptions?: Partial<ModalOptions>
  ) {
    this.shadow = shadow;
    this.onClose = callbacks.onClose;
    this.onReselect = callbacks.onReselect;
    this.onToast = callbacks.onToast;

    if (initialOptions) {
      this.currentOptions = { ...this.currentOptions, ...initialOptions };
    }
  }

  public setOptions(options: Partial<ModalOptions>): void {
    this.currentOptions = { ...this.currentOptions, ...options };
  }

  private detectBackgroundColor(element: HTMLElement): string | undefined {
    let current: HTMLElement | null = element;
    while (current && current !== document.documentElement) {
      const style = window.getComputedStyle(current);
      const bg = style.backgroundColor;
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && !bg.endsWith(', 0)')) {
        return bg;
      }
      current = current.parentElement;
    }

    const bodyStyle = window.getComputedStyle(document.body);
    const bodyBg = bodyStyle.backgroundColor;
    if (bodyBg && bodyBg !== 'transparent' && bodyBg !== 'rgba(0, 0, 0, 0)' && !bodyBg.endsWith(', 0)')) {
      return bodyBg;
    }

    return undefined;
  }

  public async show(
    element: HTMLElement,
    captureType: 'element' | 'console' | 'network' = 'element',
    chunkElements?: HTMLElement[],
    rawItems?: any[]
  ): Promise<void> {
    this.rawItems = rawItems || [];
    if (chunkElements && chunkElements.length > 0) {
      this.chunkElements = chunkElements;
      this.totalPages = chunkElements.length;
      this.currentPageIndex = 0;
      this.currentElement = chunkElements[0];
    } else {
      this.chunkElements = [element];
      this.totalPages = 1;
      this.currentPageIndex = 0;
      this.currentElement = element;
    }

    this.currentCaptureType = captureType;
    this.screenCapture = null;
    this.strokes = [];
    this.usesEngine = captureType !== 'element';

    if (captureType === 'console' || captureType === 'network') {
      this.detectedBgColor = '#0f172a';
      this.currentOptions.backgroundColor = '#0f172a';
    } else {
      this.detectedBgColor = this.detectBackgroundColor(element);
      this.currentOptions.backgroundColor = this.detectedBgColor;
    }

    this.hide();
    const session = this.session;
    if (!this.usesEngine) await this.captureScreenPixels();
    if (session !== this.session) return;

    this.createModalDOM();
    await this.refreshCapture();
  }

  public async showImage(capture: ScreenCapture): Promise<void> {
    this.rawItems = [];
    this.chunkElements = [];
    this.totalPages = 1;
    this.currentPageIndex = 0;
    this.currentElement = null;
    this.currentCaptureType = 'area';
    this.screenCapture = capture;
    this.strokes = [];
    this.usesEngine = false;
    this.detectedBgColor = undefined;
    this.currentOptions.backgroundColor = undefined;

    this.hide();
    this.createModalDOM();
    await this.refreshCapture();
  }

  private async captureScreenPixels(): Promise<void> {
    const host = this.shadow.host;
    try {
      if (!this.currentElement || !(host instanceof HTMLElement)) {
        throw new Error('There is no element to read from the screen.');
      }
      this.screenCapture = await captureElementFromScreen(this.currentElement, host);
    } catch {
      this.usesEngine = true;
      this.onToast(translations[this.currentOptions.language].modal.engineFallback, 'ℹ️');
    }
  }

  private usesScreenPixels(): boolean {
    return !this.usesEngine && this.screenCapture !== null;
  }

  public hide(): void {
    this.session++;
    this.annotator?.close();
    this.annotator = null;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.backdrop) {
      this.backdrop.remove();
      this.backdrop = null;
    }
  }

  private renderPreviewImage(previewBox: HTMLElement | null, dataUrl: string): void {
    if (!previewBox) return;
    previewBox.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'sharedom-preview-img';
    img.src = dataUrl;

    const meta = document.createElement('div');
    meta.className = 'sharedom-preview-meta';
    const format = this.currentOptions.format.toUpperCase();
    if (this.screenCapture && !this.usesEngine) {
      const { canvas, pixelRatio } = this.screenCapture;
      const ratio = Number(pixelRatio.toFixed(2));
      meta.textContent = `${canvas.width} × ${canvas.height} px (${ratio}x ${format})`;
    } else if (this.currentElement) {
      const rect = this.currentElement.getBoundingClientRect();
      const width = Math.round(rect.width * this.currentOptions.scale);
      const height = Math.round(rect.height * this.currentOptions.scale);
      meta.textContent = `${width} × ${height} px (${this.currentOptions.scale}x ${format})`;
    }

    previewBox.appendChild(img);
    previewBox.appendChild(meta);
  }

  private async switchPage(newIndex: number): Promise<void> {
    if (newIndex < 0 || newIndex >= this.totalPages) return;
    this.currentPageIndex = newIndex;
    this.currentElement = this.chunkElements[newIndex];

    const prevBtn = this.backdrop?.querySelector('#sharedom-prev-page-btn') as HTMLButtonElement | null;
    const nextBtn = this.backdrop?.querySelector('#sharedom-next-page-btn') as HTMLButtonElement | null;
    const indicator = this.backdrop?.querySelector('#sharedom-page-indicator');
    const previewBox = this.shadow.getElementById('sharedom-modal-preview-box');

    if (prevBtn) prevBtn.disabled = newIndex === 0;
    if (nextBtn) nextBtn.disabled = newIndex === this.totalPages - 1;
    if (indicator) indicator.textContent = `${newIndex + 1} / ${this.totalPages}`;

    if (this.chunkDataUrls[newIndex]) {
      this.currentDataUrl = this.chunkDataUrls[newIndex];
      this.renderPreviewImage(previewBox, this.currentDataUrl);
    } else {
      const t = translations[this.currentOptions.language].modal;
      if (previewBox) {
        previewBox.innerHTML = `
          <div class="sharedom-preview-loader">
            <div class="sharedom-spinner"></div>
            <span>${t.rendering}</span>
          </div>
        `;
      }
      try {
        const url = await capture(this.currentElement, {
          scale: this.currentOptions.scale,
          format: this.currentOptions.format,
          backgroundColor: this.currentOptions.backgroundColor,
          optimize: true,
        });
        this.chunkDataUrls[newIndex] = url;
        if (this.currentPageIndex === newIndex) {
          this.currentDataUrl = url;
          this.renderPreviewImage(previewBox, url);
        }
      } catch {
        if (previewBox) {
          previewBox.innerHTML = `
            <div style="color: #ef4444; font-size: 13px; text-align: center; padding: 16px;">
              Failed to render page
            </div>
          `;
        }
      }
    }
  }

  private scheduleBackgroundPreRender(options: CaptureOptions): void {
    const renderNext = (idx: number) => {
      if (idx >= this.chunkElements.length) return;
      if (!this.chunkDataUrls[idx]) {
        capture(this.chunkElements[idx], options)
          .then((url) => {
            this.chunkDataUrls[idx] = url;
            this.idleTimer = window.setTimeout(() => renderNext(idx + 1), 60);
          })
          .catch(() => {
            this.idleTimer = window.setTimeout(() => renderNext(idx + 1), 60);
          });
      } else {
        renderNext(idx + 1);
      }
    };

    this.idleTimer = window.setTimeout(() => renderNext(1), 100);
  }

  private async ensureAllChunksCaptured(): Promise<void> {
    const options: CaptureOptions = {
      scale: this.currentOptions.scale,
      format: this.currentOptions.format,
      backgroundColor: this.currentOptions.backgroundColor,
      optimize: true,
    };
    for (let i = 0; i < this.chunkElements.length; i++) {
      if (!this.chunkDataUrls[i]) {
        this.chunkDataUrls[i] = await capture(this.chunkElements[i], options);
      }
    }
  }

  private createModalDOM(): void {
    const t = translations[this.currentOptions.language].modal;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'sharedom-modal-backdrop';

    const card = document.createElement('div');
    card.className = 'sharedom-modal-card';
    card.addEventListener('click', (e) => e.stopPropagation());

    const header = document.createElement('div');
    header.className = 'sharedom-modal-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'sharedom-modal-title-wrap';

    const logo = document.createElement('div');
    logo.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="28" height="28" fill="none">
        <defs>
          <linearGradient id="sharedomModalLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#a78bfa" />
            <stop offset="100%" stop-color="#7c3aed" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#sharedomModalLogoGrad)" />
        <rect x="1" y="1" width="46" height="46" rx="11" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
        <path d="M12 18V14H16" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M36 18V14H32" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M12 30V34H16" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M36 30V34H32" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M19 22L16 24.5L19 27" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M29 22L32 24.5L29 27" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="24" cy="24.5" r="3" fill="white" />
        <circle cx="34" cy="14" r="1.5" fill="#facc15" />
      </svg>
    `;

    const textWrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'sharedom-modal-title';

    const subtitle = document.createElement('div');
    subtitle.className = 'sharedom-modal-subtitle';

    if (this.currentCaptureType === 'console') {
      title.textContent = t.consoleTitle;
      subtitle.textContent = t.logsSubtitle;
    } else if (this.currentCaptureType === 'network') {
      title.textContent = t.networkTitle;
      subtitle.textContent = t.networkSubtitle;
    } else if (this.currentCaptureType === 'area' && this.screenCapture) {
      title.textContent = t.areaTitle;
      subtitle.textContent = `${this.screenCapture.canvas.width} × ${this.screenCapture.canvas.height} px`;
    } else if (this.currentElement) {
      title.textContent = t.title;
      const tag = this.currentElement.tagName.toLowerCase();
      const idStr = this.currentElement.id ? `#${this.currentElement.id}` : '';
      const classStr = this.currentElement.className && typeof this.currentElement.className === 'string'
        ? `.${this.currentElement.className.trim().split(/\s+/).slice(0, 2).join('.')}`
        : '';
      subtitle.textContent = `<${tag}${idStr}${classStr}>`;
    }

    textWrap.appendChild(title);
    textWrap.appendChild(subtitle);
    titleWrap.appendChild(logo);
    titleWrap.appendChild(textWrap);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'sharedom-icon-btn';
    closeBtn.setAttribute('title', 'Close (Esc)');
    closeBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeBtn.addEventListener('click', () => {
      this.hide();
      this.onClose();
    });

    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'sharedom-modal-body';

    const previewContainer = document.createElement('div');
    previewContainer.className = 'sharedom-preview-container';
    previewContainer.id = 'sharedom-modal-preview-box';

    const loader = document.createElement('div');
    loader.className = 'sharedom-preview-loader';
    loader.innerHTML = `
      <div class="sharedom-spinner"></div>
      <span>${t.rendering}</span>
    `;
    previewContainer.appendChild(loader);

    body.appendChild(previewContainer);

    if (this.totalPages > 1) {
      const paginationBar = document.createElement('div');
      paginationBar.className = 'sharedom-pagination-bar';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'sharedom-page-btn';
      prevBtn.id = 'sharedom-prev-page-btn';
      prevBtn.title = t.prevPage;
      prevBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <span>${t.prevPage}</span>
      `;
      prevBtn.disabled = this.currentPageIndex === 0;

      const pageIndicator = document.createElement('span');
      pageIndicator.className = 'sharedom-page-indicator';
      pageIndicator.id = 'sharedom-page-indicator';
      pageIndicator.textContent = `${this.currentPageIndex + 1} / ${this.totalPages}`;

      const nextBtn = document.createElement('button');
      nextBtn.className = 'sharedom-page-btn';
      nextBtn.id = 'sharedom-next-page-btn';
      nextBtn.title = t.nextPage;
      nextBtn.innerHTML = `
        <span>${t.nextPage}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `;
      nextBtn.disabled = this.currentPageIndex === this.totalPages - 1;

      prevBtn.addEventListener('click', async () => {
        if (this.currentPageIndex > 0) {
          await this.switchPage(this.currentPageIndex - 1);
        }
      });

      nextBtn.addEventListener('click', async () => {
        if (this.currentPageIndex < this.totalPages - 1) {
          await this.switchPage(this.currentPageIndex + 1);
        }
      });

      paginationBar.appendChild(prevBtn);
      paginationBar.appendChild(pageIndicator);
      paginationBar.appendChild(nextBtn);
      body.appendChild(paginationBar);
    }

    const controlsGrid = document.createElement('div');
    controlsGrid.className = 'sharedom-controls-grid';

    const scaleGroup = document.createElement('div');
    scaleGroup.className = 'sharedom-control-group';
    const scaleLabel = document.createElement('label');
    scaleLabel.className = 'sharedom-control-label';
    scaleLabel.textContent = t.resolution;

    const scaleBtnGroup = document.createElement('div');
    scaleBtnGroup.className = 'sharedom-btn-group';

    const scales = [1, 2, 3];
    scales.forEach((s) => {
      const btn = document.createElement('button');
      btn.className = `sharedom-btn-option ${this.currentOptions.scale === s ? 'active' : ''}`;
      btn.textContent = `${s}x`;
      btn.disabled = !this.usesEngine;
      btn.addEventListener('click', async () => {
        if (this.currentOptions.scale === s || this.isCapturing) return;
        scaleBtnGroup.querySelectorAll('.sharedom-btn-option').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentOptions.scale = s;
        await this.refreshCapture();
      });
      scaleBtnGroup.appendChild(btn);
    });

    scaleGroup.appendChild(scaleLabel);
    scaleGroup.appendChild(scaleBtnGroup);

    const formatGroup = document.createElement('div');
    formatGroup.className = 'sharedom-control-group';
    const formatLabel = document.createElement('label');
    formatLabel.className = 'sharedom-control-label';
    formatLabel.textContent = t.format;

    const formatSelectWrap = document.createElement('div');
    formatSelectWrap.className = 'sharedom-select-wrap';

    const formatSelect = document.createElement('select');
    formatSelect.className = 'sharedom-select';
    ['png', 'jpeg', 'webp'].forEach((fmt) => {
      const opt = document.createElement('option');
      opt.value = fmt;
      opt.textContent = fmt.toUpperCase();
      if (this.currentOptions.format === fmt) opt.selected = true;
      formatSelect.appendChild(opt);
    });

    formatSelect.addEventListener('change', async () => {
      if (this.isCapturing) return;
      this.currentOptions.format = formatSelect.value as 'png' | 'jpeg' | 'webp';
      await this.refreshCapture();
    });

    formatSelectWrap.appendChild(formatSelect);
    formatGroup.appendChild(formatLabel);
    formatGroup.appendChild(formatSelectWrap);

    const bgGroup = document.createElement('div');
    bgGroup.className = 'sharedom-control-group';
    const bgLabel = document.createElement('label');
    bgLabel.className = 'sharedom-control-label';
    bgLabel.textContent = t.background;

    const bgSelectWrap = document.createElement('div');
    bgSelectWrap.className = 'sharedom-select-wrap';

    const bgSelect = document.createElement('select');
    bgSelect.className = 'sharedom-select';

    const bgOptions: Array<{ label: string; value: string }> = [];

    if (this.detectedBgColor) {
      bgOptions.push({ label: t.bgAuto, value: 'auto' });
    }
    bgOptions.push({ label: t.bgTransparent, value: 'transparent' });
    bgOptions.push({ label: t.bgWhite, value: '#ffffff' });
    bgOptions.push({ label: t.bgDark, value: '#111116' });
    bgOptions.push({ label: t.bgCustom, value: 'custom' });

    bgOptions.forEach((optData) => {
      const opt = document.createElement('option');
      opt.value = optData.value;
      opt.textContent = optData.label;

      if (this.detectedBgColor && optData.value === 'auto') {
        opt.selected = true;
      } else if (!this.detectedBgColor && optData.value === 'transparent') {
        opt.selected = true;
      }

      bgSelect.appendChild(opt);
    });

    const customColorInput = document.createElement('input');
    customColorInput.type = 'color';
    customColorInput.value = this.detectedBgColor ? rgbToHex(this.detectedBgColor) : '#6366f1';
    customColorInput.style.display = 'none';
    customColorInput.className = 'sharedom-color-picker';

    bgSelect.addEventListener('change', async () => {
      if (this.isCapturing) return;
      const val = bgSelect.value;
      if (val === 'custom') {
        customColorInput.style.display = 'inline-block';
        this.currentOptions.backgroundColor = customColorInput.value;
      } else {
        customColorInput.style.display = 'none';
        if (val === 'auto') {
          this.currentOptions.backgroundColor = this.detectedBgColor;
        } else if (val === 'transparent') {
          this.currentOptions.backgroundColor = undefined;
        } else {
          this.currentOptions.backgroundColor = val;
        }
      }
      await this.refreshCapture();
    });

    customColorInput.addEventListener('input', async () => {
      if (this.isCapturing) return;
      this.currentOptions.backgroundColor = customColorInput.value;
      await this.refreshCapture();
    });

    bgSelectWrap.appendChild(bgSelect);
    bgGroup.appendChild(bgLabel);
    bgGroup.appendChild(bgSelectWrap);
    bgGroup.appendChild(customColorInput);

    controlsGrid.appendChild(scaleGroup);
    controlsGrid.appendChild(formatGroup);
    controlsGrid.appendChild(bgGroup);

    this.scaleButtons = scaleBtnGroup;
    this.backgroundGroup = bgGroup;
    bgGroup.hidden = !this.usesEngine;
    body.appendChild(controlsGrid);

    const footer = document.createElement('div');
    footer.className = 'sharedom-modal-footer';

    const footerLeft = document.createElement('div');
    footerLeft.className = 'sharedom-footer-left';

    const reselectBtn = document.createElement('button');
    reselectBtn.className = 'sharedom-btn sharedom-btn-secondary sharedom-btn-icon';
    reselectBtn.setAttribute('title', t.reselectTooltip);
    reselectBtn.setAttribute('aria-label', t.reselectTooltip);
    reselectBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
        <path d="M21 3v5h-5"></path>
      </svg>
    `;
    reselectBtn.addEventListener('click', () => {
      this.hide();
      this.onReselect();
    });

    if (this.canAnnotate()) {
      const editBtn = document.createElement('button');
      editBtn.className = 'sharedom-btn sharedom-btn-secondary sharedom-btn-icon';
      editBtn.setAttribute('title', t.edit);
      editBtn.setAttribute('aria-label', t.edit);
      editBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      `;
      editBtn.addEventListener('click', async () => {
        await this.openAnnotator();
      });

      footerLeft.appendChild(reselectBtn);
      footerLeft.appendChild(editBtn);
    } else if (this.currentCaptureType === 'console') {
      const copyLogsBtn = document.createElement('button');
      copyLogsBtn.className = 'sharedom-btn sharedom-btn-copylogs';
      copyLogsBtn.setAttribute('title', t.copyLogsTooltip);
      copyLogsBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <line x1="10" y1="9" x2="8" y2="9"></line>
        </svg>
        <span>${t.copyLogs}</span>
      `;
      copyLogsBtn.addEventListener('click', async () => {
        await this.copyLogsAsText();
      });
      footerLeft.appendChild(copyLogsBtn);
    } else if (this.currentCaptureType === 'network') {
      const copyNetworkBtn = document.createElement('button');
      copyNetworkBtn.className = 'sharedom-btn sharedom-btn-copynetwork';
      copyNetworkBtn.setAttribute('title', t.copyNetworkTooltip);
      copyNetworkBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        <span>${t.copyNetwork}</span>
      `;
      copyNetworkBtn.addEventListener('click', async () => {
        await this.copyNetworkAsText();
      });
      footerLeft.appendChild(copyNetworkBtn);
    }

    const footerRight = document.createElement('div');
    footerRight.className = 'sharedom-footer-right';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'sharedom-btn sharedom-btn-secondary';
    downloadBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      ${t.download}
    `;
    downloadBtn.addEventListener('click', async () => {
      await this.triggerDownload();
    });

    const downloadPdfBtn = document.createElement('button');
    downloadPdfBtn.className = 'sharedom-btn sharedom-btn-secondary';
    downloadPdfBtn.setAttribute('title', t.pdfTooltip);
    downloadPdfBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      ${t.pdf}
    `;
    downloadPdfBtn.addEventListener('click', async () => {
      await this.triggerPdfDownload(downloadPdfBtn);
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'sharedom-btn sharedom-btn-primary';
    copyBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      ${t.copyImage}
    `;
    copyBtn.addEventListener('click', async () => {
      await this.copyImageToClipboard();
    });

    if (typeof navigator.share === 'function') {
      const shareBtn = document.createElement('button');
      shareBtn.className = 'sharedom-btn sharedom-btn-secondary sharedom-btn-icon';
      shareBtn.setAttribute('title', t.share);
      shareBtn.setAttribute('aria-label', t.share);
      shareBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
      `;
      shareBtn.addEventListener('click', async () => {
        await this.shareImage();
      });
      footerRight.appendChild(shareBtn);
    }

    footerRight.appendChild(downloadBtn);
    footerRight.appendChild(downloadPdfBtn);
    footerRight.appendChild(copyBtn);

    footer.appendChild(footerLeft);
    footer.appendChild(footerRight);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);

    this.backdrop.appendChild(card);
    this.shadow.appendChild(this.backdrop);

    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (this.closeAnnotator()) return;
        this.hide();
        this.onClose();
      } else if (e.key === 'ArrowLeft' && this.totalPages > 1) {
        this.switchPage(this.currentPageIndex - 1);
      } else if (e.key === 'ArrowRight' && this.totalPages > 1) {
        this.switchPage(this.currentPageIndex + 1);
      }
    };
    window.addEventListener('keydown', this.keydownHandler);
  }

  public closeAnnotator(): boolean {
    if (!this.annotator) return false;
    this.annotator.close();
    return true;
  }

  private canAnnotate(): boolean {
    return this.currentCaptureType === 'element' || this.currentCaptureType === 'area';
  }

  private syncEngineControls(): void {
    this.scaleButtons?.querySelectorAll('button').forEach((button) => (button.disabled = !this.usesEngine));
    if (this.backgroundGroup) this.backgroundGroup.hidden = !this.usesEngine;
  }

  private exportCanvas(format: ModalOptions['format']): HTMLCanvasElement {
    if (!this.screenCapture) throw new Error('No screen capture to encode.');
    const source = this.screenCapture.canvas;
    const isOpaqueFormat = format === 'jpeg';
    if (this.strokes.length === 0 && !isOpaqueFormat) return source;

    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not obtain a 2D canvas context.');

    if (isOpaqueFormat) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(source, 0, 0);
    drawStrokes(context, this.strokes);
    return canvas;
  }

  private encodeScreenCapture(format: ModalOptions['format']): string {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    return this.exportCanvas(format).toDataURL(mimeType, SCREEN_EXPORT_QUALITY);
  }

  private refreshScreenCapture(previewBox: HTMLElement | null): void {
    this.currentDataUrl = this.encodeScreenCapture(this.currentOptions.format);
    this.chunkDataUrls = [this.currentDataUrl];
    this.renderPreviewImage(previewBox, this.currentDataUrl);
  }

  private async rasterizeEngineCapture(): Promise<ScreenCapture> {
    if (!this.currentElement) throw new Error('There is no element to rasterize.');

    const isPng = this.currentOptions.format === 'png' && this.currentDataUrl.startsWith('data:image/png');
    const dataUrl = isPng
      ? this.currentDataUrl
      : await capture(this.currentElement, {
          scale: this.currentOptions.scale,
          format: 'png',
          backgroundColor: this.currentOptions.backgroundColor,
          optimize: true,
        });

    const image = new Image();
    image.src = dataUrl;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not obtain a 2D canvas context.');
    context.drawImage(image, 0, 0);

    return { canvas, pixelRatio: this.currentOptions.scale };
  }

  private async openAnnotator(): Promise<void> {
    if (this.isCapturing || this.annotator) return;
    const t = translations[this.currentOptions.language].modal;
    const session = this.session;

    let source: ScreenCapture;
    try {
      source =
        this.screenCapture && !this.usesEngine ? this.screenCapture : await this.rasterizeEngineCapture();
    } catch {
      this.onToast(t.captureFailed, '⚠️');
      return;
    }
    if (session !== this.session || this.annotator) return;

    const annotator = new ImageAnnotator(this.shadow, {
      done: t.editDone,
      cancel: t.editCancel,
      undo: t.editUndo,
      clear: t.editClear,
    });
    this.annotator = annotator;
    const strokes = await annotator.open(source.canvas, this.strokes);
    if (this.annotator !== annotator) return;
    this.annotator = null;
    if (!strokes) return;

    this.screenCapture = source;
    this.usesEngine = false;
    this.strokes = strokes;
    this.syncEngineControls();
    await this.refreshCapture();
  }

  private fileBaseName(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    if (this.currentCaptureType === 'console') return `sharedom-console-${timestamp}`;
    if (this.currentCaptureType === 'network') return `sharedom-network-${timestamp}`;
    if (!this.currentElement) return `sharedom-area-${timestamp}`;

    const tag = this.currentElement.tagName.toLowerCase();
    const id = this.currentElement.id ? `-${this.currentElement.id}` : '';
    return `sharedom-${tag}${id}-${timestamp}`;
  }

  private async shareImage(): Promise<void> {
    if (!this.currentDataUrl) return;
    const t = translations[this.currentOptions.language].modal;

    try {
      const response = await fetch(this.currentDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${this.fileBaseName()}.${this.currentOptions.format}`, { type: blob.type });
      if (!navigator.canShare?.({ files: [file] })) {
        this.onToast(t.shareError, '⚠️');
        return;
      }
      await navigator.share({ files: [file] });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.onToast(t.shareError, '⚠️');
    }
  }

  private async refreshCapture(): Promise<void> {
    if (!this.shadow) return;
    const t = translations[this.currentOptions.language].modal;
    this.isCapturing = true;

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    const previewBox = this.shadow.getElementById('sharedom-modal-preview-box');
    if (previewBox) {
      previewBox.innerHTML = `
        <div class="sharedom-preview-loader">
          <div class="sharedom-spinner"></div>
          <span>${t.rendering}</span>
        </div>
      `;
    }

    try {
      if (this.usesScreenPixels()) {
        this.refreshScreenCapture(previewBox);
        return;
      }

      const options: CaptureOptions = {
        scale: this.currentOptions.scale,
        format: this.currentOptions.format,
        backgroundColor: this.currentOptions.backgroundColor,
        optimize: true,
      };

      // Reset chunks and immediately render ONLY the active page
      this.chunkDataUrls = new Array(this.chunkElements.length).fill('');
      const activeElement = this.chunkElements[this.currentPageIndex] || this.chunkElements[0];
      const activeUrl = await capture(activeElement, options);
      this.chunkDataUrls[this.currentPageIndex] = activeUrl;
      this.currentDataUrl = activeUrl;

      // Render modal preview right away
      this.renderPreviewImage(previewBox, activeUrl);

      // Lazily pre-render remaining chunks in idle time without blocking UI
      if (this.totalPages > 1) {
        this.scheduleBackgroundPreRender(options);
      }
    } catch (error) {
      if (previewBox) {
        const message = document.createElement('div');
        message.style.cssText = 'color: #ef4444; font-size: 13px; text-align: center; padding: 16px;';
        const detail = document.createElement('span');
        detail.style.cssText = 'font-size: 11px; color: #a1a1aa;';
        detail.textContent = String(error);
        message.append(t.captureFailed, document.createElement('br'), detail);
        previewBox.replaceChildren(message);
      }
    } finally {
      this.isCapturing = false;
    }
  }

  private async copyImageToClipboard(): Promise<void> {
    const t = translations[this.currentOptions.language].modal;

    try {
      if (this.totalPages > 1) {
        await this.ensureAllChunksCaptured();

        const htmlImgs = this.chunkDataUrls
          .map((url, idx) => `<div style="margin-bottom: 16px;"><img src="${url}" alt="Page ${idx + 1}" style="max-width: 100%; border-radius: 12px; display: block;" /></div>`)
          .join('');
        const htmlPayload = `<div style="display: flex; flex-direction: column; gap: 16px;">${htmlImgs}</div>`;
        const htmlBlob = new Blob([htmlPayload], { type: 'text/html' });

        const currentRes = await fetch(this.currentDataUrl);
        const currentBlob = await currentRes.blob();

        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'image/png': currentBlob,
          }),
        ]);
        this.onToast(t.allCopied, '📋');
        return;
      }

      let pngBlob: Blob;

      if (this.currentOptions.format === 'png' && this.currentDataUrl.startsWith('data:image/png')) {
        const res = await fetch(this.currentDataUrl);
        pngBlob = await res.blob();
      } else if (this.usesScreenPixels()) {
        const res = await fetch(this.encodeScreenCapture('png'));
        pngBlob = await res.blob();
      } else {
        if (!this.currentElement) throw new Error('There is no element to copy.');
        const pngDataUrl = await capture(this.currentElement, {
          scale: this.currentOptions.scale,
          format: 'png',
          backgroundColor: this.currentOptions.backgroundColor,
          optimize: true,
        });
        const res = await fetch(pngDataUrl);
        pngBlob = await res.blob();
      }

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob }),
      ]);

      this.onToast(t.copySuccess, '📋');
    } catch (error) {
      try {
        if (this.currentDataUrl) {
          await navigator.clipboard.writeText(this.currentDataUrl);
          this.onToast(t.dataUrlSuccess, '📋');
          return;
        }
      } catch {}
      this.onToast(t.copyError, '⚠️');
    }
  }

  private async triggerDownload(): Promise<void> {
    if (!this.currentDataUrl) return;
    const t = translations[this.currentOptions.language].modal;

    const ext = this.currentOptions.format;
    const basePrefix = this.fileBaseName();

    if (this.totalPages > 1) {
      await this.ensureAllChunksCaptured();

      const zipFiles: ZipFileInput[] = this.chunkDataUrls.map((url, i) => ({
        name: `${basePrefix}-part${i + 1}.${ext}`,
        data: url,
      }));

      downloadZip(zipFiles, `${basePrefix}.zip`);
      this.onToast(t.zipDownloaded || t.allDownloaded, '📦');
      return;
    }

    const link = document.createElement('a');
    link.download = `${basePrefix}.${ext}`;
    link.href = this.currentDataUrl;
    link.click();

    this.onToast(`${t.downloaded} ${link.download}`, '📥');
  }

  private async triggerPdfDownload(btn?: HTMLButtonElement): Promise<void> {
    if (this.isCapturing) return;
    const t = translations[this.currentOptions.language].modal;

    const filename = `${this.fileBaseName()}.pdf`;

    const originalHTML = btn?.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <div class="sharedom-spinner" style="width:13px;height:13px;border-width:2px;display:inline-block"></div>
        <span>${t.pdf}</span>
      `;
    }

    try {
      const bgColor = this.currentOptions.backgroundColor ?? '#ffffff';
      const pdfOpts: PdfOptions = {
        scale: this.currentOptions.scale,
        backgroundColor: bgColor,
        quality: 0.92,
        pageSize: 'auto',
      };

      if (this.screenCapture && !this.usesEngine) {
        const { canvas, pixelRatio } = this.screenCapture;
        const jpeg = this.encodeScreenCapture('jpeg');
        const bin = atob(jpeg.split(',')[1]);
        const bytes = new Uint8Array(bin.length);
        for (let b = 0; b < bin.length; b++) bytes[b] = bin.charCodeAt(b);
        const pdfBytes = buildPdf(bytes, {
          imageWidthPx: canvas.width,
          imageHeightPx: canvas.height,
          dpi: 96 * pixelRatio,
          pageSize: 'auto',
          margin: 0,
        });
        const url = URL.createObjectURL(new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.onToast(`${t.pdfSuccess} ${filename}`, '📄');
      } else if (this.totalPages > 1 && this.chunkElements.length > 1) {
        const pages: { jpegBytes: Uint8Array; imageWidthPx: number; imageHeightPx: number }[] = [];
        for (const el of this.chunkElements) {
          const rect = el.getBoundingClientRect();
          const w = Math.round(rect.width * this.currentOptions.scale);
          const h = Math.round(rect.height * this.currentOptions.scale);
          const jpegDataUrl = await capture(el, {
            scale: this.currentOptions.scale,
            format: 'jpeg',
            quality: 0.92,
            backgroundColor: bgColor,
            optimize: true,
          });
          const bin = atob(jpegDataUrl.split(',')[1]);
          const bytes = new Uint8Array(bin.length);
          for (let b = 0; b < bin.length; b++) bytes[b] = bin.charCodeAt(b);
          pages.push({ jpegBytes: bytes, imageWidthPx: w, imageHeightPx: h });
        }
        const pdfBytes = buildMultiPagePdf({
          pages,
          dpi: 96 * this.currentOptions.scale,
          pageSize: 'auto',
          margin: 0,
        });
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.onToast(`${t.pdfSuccess} ${filename}`, '📄');
      } else if (this.currentElement) {
        await downloadPDF(this.currentElement, filename, pdfOpts);
        this.onToast(`${t.pdfSuccess} ${filename}`, '📄');
      }
    } catch (error) {
      this.onToast(`${t.pdfError}: ${String(error)}`, '⚠️');
    } finally {
      if (btn && originalHTML) {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    }
  }

  private async copyLogsAsText(): Promise<void> {
    const t = translations[this.currentOptions.language].modal;
    const logs = this.rawItems;
    if (!logs || logs.length === 0) {
      this.onToast(t.noLogsToCopy, 'ℹ️');
      return;
    }

    try {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const formatTime = (ts: number) => {
        const d = new Date(ts);
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      };

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const header = `=== ShareDOM Console Logs (${logs.length} ${logs.length === 1 ? 'log' : 'logs'}) - ${dateStr} ===\n`;

      const lines = logs.map((log) => {
        const time = log.timestamp ? formatTime(log.timestamp) : formatTime(Date.now());
        const level = (log.level || 'LOG').toUpperCase().padEnd(5, ' ');
        const count = log.count && log.count > 1 ? ` (x${log.count})` : '';
        return `[${time}] [${level}] ${log.message}${count}`;
      });

      const fullText = header + '\n' + lines.join('\n');
      await navigator.clipboard.writeText(fullText);
      this.onToast(t.logsCopied, '📋');
    } catch {
      this.onToast(t.logsCopyError, '⚠️');
    }
  }

  private async copyNetworkAsText(): Promise<void> {
    const t = translations[this.currentOptions.language].modal;
    const reqs = this.rawItems;
    if (!reqs || reqs.length === 0) {
      this.onToast(t.noRequestsToCopy, 'ℹ️');
      return;
    }

    try {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const formatTime = (ts: number) => {
        const d = new Date(ts);
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      };

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const header = `=== ShareDOM Network Requests (${reqs.length} ${reqs.length === 1 ? 'request' : 'requests'}) - ${dateStr} ===\n`;

      const lines = reqs.map((req) => {
        const time = req.timestamp ? formatTime(req.timestamp) : formatTime(Date.now());
        const method = (req.method || 'GET').toUpperCase().padEnd(6, ' ');
        const status = req.status ? String(req.status).padEnd(3, ' ') : 'ERR';
        const duration = req.duration !== undefined ? `${req.duration}ms` : '';
        const type = req.type ? `[${req.type}]` : '';
        const urlStr = req.url || req.name || '';
        return `[${time}] ${method} ${status} ${type.padEnd(8, ' ')} ${urlStr} (${duration})`;
      });

      const fullText = header + '\n' + lines.join('\n');
      await navigator.clipboard.writeText(fullText);
      this.onToast(t.networkCopied, '📋');
    } catch {
      this.onToast(t.networkCopyError, '⚠️');
    }
  }
}
