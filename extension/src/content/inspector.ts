import { OverlayManager } from './overlay';
import { ActionModal } from './modal';
import { ExtensionLanguage, normalizeLanguage, translations } from '../shared/i18n';
import {
  getConsoleLogs,
  getNetworkRequests,
  createConsoleLogsElement,
  createNetworkRequestsElement,
  chunkItems,
  startConsoleCapture,
  startNetworkCapture,
  ConsoleLogEntry,
  NetworkRequestEntry,
} from '../../../src/index';

const NON_VISUAL_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'LINK',
  'META',
  'NOSCRIPT',
  'TEMPLATE',
  'TITLE',
  'BASE',
  'HEAD',
]);

export interface InspectorStartOptions {
  scale?: number;
  format?: 'png' | 'jpeg' | 'webp';
  language?: ExtensionLanguage;
}

const pageLogs: ConsoleLogEntry[] = [];
const pageRequests: NetworkRequestEntry[] = [];

export function requestMainWorldSync(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        window.removeEventListener('__sharedom_sync_response__', onResponse);
        resolve();
      }
    }, 40);

    const onResponse = (e: Event) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      window.removeEventListener('__sharedom_sync_response__', onResponse);

      try {
        let detail = (e as CustomEvent).detail;
        if (typeof detail === 'string') detail = JSON.parse(detail);
        if (detail && Array.isArray(detail.logs)) {
          pageLogs.length = 0;
          pageLogs.push(...detail.logs);
        }
        if (detail && Array.isArray(detail.reqs)) {
          pageRequests.length = 0;
          pageRequests.push(...detail.reqs);
        }
      } catch {}
      resolve();
    };

    window.addEventListener('__sharedom_sync_response__', onResponse);
    try {
      window.dispatchEvent(new CustomEvent('__sharedom_request_sync__'));
    } catch {
      clearTimeout(timeout);
      window.removeEventListener('__sharedom_sync_response__', onResponse);
      resolve();
    }
  });
}

export class DomInspector {
  private overlay: OverlayManager | null = null;
  private modal: ActionModal | null = null;
  private isActive = false;
  private isModalOpen = false;
  private hoveredElement: HTMLElement | null = null;
  private selectedElement: HTMLElement | null = null;
  private temporaryWrapper: HTMLElement | null = null;
  private currentLanguage: ExtensionLanguage = 'en';
  private lastPointer: { x: number; y: number } | null = null;
  private isKeyboardNavigating = false;

  private onMouseMoveBound = this.onMouseMove.bind(this);
  private onMouseOverBound = this.onMouseOver.bind(this);
  private onClickBound = this.onClick.bind(this);
  private onKeyDownBound = this.onKeyDown.bind(this);
  private onScrollBound = this.onScroll.bind(this);

  private async initOverlayAndModal(options?: InspectorStartOptions): Promise<{ scale: number; format: 'png' | 'jpeg' | 'webp' }> {
    let scale = options?.scale ?? 2;
    let format = options?.format ?? 'png';
    let language = options?.language;

    if (!language) {
      try {
        const stored = await chrome.storage.local.get(['language', 'defaultScale', 'defaultFormat']);
        language = normalizeLanguage(stored.language);
        if (stored.defaultScale && !options?.scale) {
          scale = Number(stored.defaultScale);
        }
        if (stored.defaultFormat && !options?.format) {
          if (stored.defaultFormat === 'png' || stored.defaultFormat === 'jpeg' || stored.defaultFormat === 'webp') {
            format = stored.defaultFormat;
          }
        }
      } catch {}
    }

    this.currentLanguage = language || 'en';

    if (!this.overlay) {
      this.overlay = new OverlayManager(this.currentLanguage);
    } else {
      this.overlay.setLanguage(this.currentLanguage);
    }

    const shadow = this.overlay.getShadowRoot();
    if (shadow && !this.modal) {
      this.modal = new ActionModal(
        shadow,
        {
          onClose: () => this.stop(),
          onReselect: () => this.resumeInspection(),
          onToast: (msg, icon) => this.overlay?.showToast(msg, icon),
        },
        { scale, format, language: this.currentLanguage }
      );
    } else if (this.modal) {
      this.modal.setOptions({ scale, format, language: this.currentLanguage });
    }

    return { scale, format };
  }

  public async start(options?: InspectorStartOptions): Promise<void> {
    if (this.isActive) return;

    this.isActive = true;
    this.isModalOpen = false;
    this.hoveredElement = null;
    this.selectedElement = null;
    this.isKeyboardNavigating = false;
    this.lastPointer = null;

    await this.initOverlayAndModal(options);
    this.overlay?.showStatusPill(() => this.stop(), this.currentLanguage);
    this.attachEvents();
  }

  public async captureConsole(options?: InspectorStartOptions): Promise<void> {
    await requestMainWorldSync();

    this.stop();
    this.isActive = true;
    this.isModalOpen = true;

    await this.initOverlayAndModal(options);

    const logs = pageLogs.length > 0 ? pageLogs : getConsoleLogs();
    const chunks = chunkItems(logs, 15);

    this.temporaryWrapper = document.createElement('div');
    this.temporaryWrapper.style.position = 'fixed';
    this.temporaryWrapper.style.top = '-99999px';
    this.temporaryWrapper.style.left = '-99999px';
    this.temporaryWrapper.style.opacity = '0';
    this.temporaryWrapper.style.pointerEvents = 'none';
    this.temporaryWrapper.style.zIndex = '-9999';

    const chunkElements: HTMLElement[] = [];
    chunks.forEach((chunk, i) => {
      const el = createConsoleLogsElement(chunk, {
        language: this.currentLanguage,
        pageIndex: i + 1,
        totalPages: chunks.length,
        startIndex: i * 15,
        totalItems: logs.length,
      });
      chunkElements.push(el);
      this.temporaryWrapper!.appendChild(el);
    });
    document.body.appendChild(this.temporaryWrapper);

    this.selectedElement = chunkElements[0];
    if (this.modal) {
      await this.modal.show(chunkElements[0], 'console', chunkElements, logs);
    }
  }

  public async captureNetwork(options?: InspectorStartOptions): Promise<void> {
    await requestMainWorldSync();

    this.stop();
    this.isActive = true;
    this.isModalOpen = true;

    await this.initOverlayAndModal(options);

    const requests = pageRequests.length > 0 ? pageRequests : getNetworkRequests();
    const chunks = chunkItems(requests, 12);

    this.temporaryWrapper = document.createElement('div');
    this.temporaryWrapper.style.position = 'fixed';
    this.temporaryWrapper.style.top = '-99999px';
    this.temporaryWrapper.style.left = '-99999px';
    this.temporaryWrapper.style.opacity = '0';
    this.temporaryWrapper.style.pointerEvents = 'none';
    this.temporaryWrapper.style.zIndex = '-9999';

    const chunkElements: HTMLElement[] = [];
    chunks.forEach((chunk, i) => {
      const el = createNetworkRequestsElement(chunk, {
        language: this.currentLanguage,
        pageIndex: i + 1,
        totalPages: chunks.length,
        startIndex: i * 12,
        totalItems: requests.length,
      });
      chunkElements.push(el);
      this.temporaryWrapper!.appendChild(el);
    });
    document.body.appendChild(this.temporaryWrapper);

    this.selectedElement = chunkElements[0];
    if (this.modal) {
      await this.modal.show(chunkElements[0], 'network', chunkElements, requests);
    }
  }

  public stop(): void {
    if (!this.isActive) return;

    this.detachEvents();
    this.isActive = false;
    this.isModalOpen = false;
    this.hoveredElement = null;
    this.selectedElement = null;

    if (this.temporaryWrapper && this.temporaryWrapper.parentNode) {
      this.temporaryWrapper.parentNode.removeChild(this.temporaryWrapper);
      this.temporaryWrapper = null;
    }

    if (this.modal) {
      this.modal.hide();
      this.modal = null;
    }

    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }

  public async toggle(options?: InspectorStartOptions): Promise<void> {
    if (this.isActive) {
      this.stop();
    } else {
      await this.start(options);
    }
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  private resumeInspection(): void {
    this.isModalOpen = false;
    this.selectedElement = null;
    if (this.overlay) {
      this.overlay.showStatusPill(() => this.stop(), this.currentLanguage);
    }
  }

  private attachEvents(): void {
    window.addEventListener('mousemove', this.onMouseMoveBound, true);
    window.addEventListener('mouseover', this.onMouseOverBound, true);
    window.addEventListener('click', this.onClickBound, true);
    window.addEventListener('keydown', this.onKeyDownBound, true);
    window.addEventListener('scroll', this.onScrollBound, true);
    window.addEventListener('resize', this.onScrollBound, true);
  }

  private detachEvents(): void {
    window.removeEventListener('mousemove', this.onMouseMoveBound, true);
    window.removeEventListener('mouseover', this.onMouseOverBound, true);
    window.removeEventListener('click', this.onClickBound, true);
    window.removeEventListener('keydown', this.onKeyDownBound, true);
    window.removeEventListener('scroll', this.onScrollBound, true);
    window.removeEventListener('resize', this.onScrollBound, true);
  }

  private isExtensionElement(target: EventTarget | null): boolean {
    if (!target || !(target instanceof Node)) return false;
    const host = this.overlay?.getHostElement();
    if (!host) return false;
    return host === target || host.contains(target);
  }

  /** Scroll, layout shifts and overlay repaints emit mousemove with unchanged coordinates. */
  private hasPointerMoved(e: MouseEvent): boolean {
    const moved =
      !this.lastPointer || this.lastPointer.x !== e.clientX || this.lastPointer.y !== e.clientY;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    return moved;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isActive || this.isModalOpen) return;
    if (!this.hasPointerMoved(e)) return;
    this.isKeyboardNavigating = false;
    if (this.isExtensionElement(e.target)) return;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || !(target instanceof HTMLElement)) return;
    if (this.isExtensionElement(target)) return;
    if (target === document.documentElement) return;

    this.hoveredElement = target;
    this.overlay?.showHighlight(target);
  }

  private onMouseOver(e: MouseEvent): void {
    if (!this.isActive || this.isModalOpen) return;
    // Keyboard navigation owns the selection until the pointer really moves again.
    if (this.isKeyboardNavigating) return;
    if (this.isExtensionElement(e.target)) return;

    if (e.target instanceof HTMLElement && e.target !== document.documentElement) {
      this.hoveredElement = e.target;
      this.overlay?.showHighlight(e.target);
    }
  }

  private async onClick(e: MouseEvent): Promise<void> {
    if (!this.isActive) return;
    if (this.isExtensionElement(e.target)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (this.isModalOpen) return;

    const target = this.hoveredElement || (e.target instanceof HTMLElement ? e.target : null);
    if (!target || target === document.documentElement) return;

    this.selectedElement = target;
    this.isModalOpen = true;

    this.overlay?.hideHighlight();
    this.overlay?.hideStatusPill();

    if (this.modal) {
      await this.modal.show(this.selectedElement, 'element');
    }
  }

  private async onKeyDown(e: KeyboardEvent): Promise<void> {
    if (!this.isActive) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.stop();
      return;
    }

    if (this.isModalOpen) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      const target = this.hoveredElement;
      if (target && target !== document.documentElement) {
        this.selectedElement = target;
        this.isModalOpen = true;
        this.overlay?.hideHighlight();
        this.overlay?.hideStatusPill();

        if (this.modal) {
          await this.modal.show(this.selectedElement, 'element');
        }
      }
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();

      const next =
        e.key === 'ArrowUp'
          ? this.selectableParent(this.hoveredElement)
          : this.firstSelectableChild(this.hoveredElement);

      if (next) this.selectWithKeyboard(next);
    }
  }

  private selectableParent(element: HTMLElement | null): HTMLElement | null {
    const parent = element?.parentElement;
    if (!parent || parent === document.documentElement) return null;
    return this.isExtensionElement(parent) ? null : parent;
  }

  private firstSelectableChild(element: HTMLElement | null): HTMLElement | null {
    if (!element) return null;

    for (const child of Array.from(element.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (NON_VISUAL_TAGS.has(child.tagName)) continue;
      if (this.isExtensionElement(child)) continue;

      const rect = child.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      return child;
    }

    return null;
  }

  private selectWithKeyboard(element: HTMLElement): void {
    this.isKeyboardNavigating = true;
    this.hoveredElement = element;

    const rect = element.getBoundingClientRect();
    const isOffScreen =
      rect.bottom <= 0 ||
      rect.right <= 0 ||
      rect.top >= window.innerHeight ||
      rect.left >= window.innerWidth;
    if (isOffScreen) {
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    this.overlay?.showHighlight(element);
  }

  private onScroll(): void {
    if (!this.isActive || this.isModalOpen || !this.hoveredElement) return;
    this.overlay?.showHighlight(this.hoveredElement);
  }
}
