import { overlayStyles } from './styles';
import { translations, ExtensionLanguage } from '../shared/i18n';

export class OverlayManager {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private statusPill: HTMLElement | null = null;
  private highlightBox: HTMLElement | null = null;
  private highlightTag: HTMLElement | null = null;
  private tagNameEl: HTMLElement | null = null;
  private tagClassEl: HTMLElement | null = null;
  private tagSizeEl: HTMLElement | null = null;
  private toastContainer: HTMLElement | null = null;
  private language: ExtensionLanguage = 'en';

  constructor(language: ExtensionLanguage = 'en') {
    this.language = language;
    this.init();
  }

  public setLanguage(language: ExtensionLanguage): void {
    this.language = language;
  }

  private init(): void {
    const existing = document.getElementById('sharedom-inspector-host');
    if (existing) {
      existing.remove();
    }

    this.host = document.createElement('div');
    this.host.id = 'sharedom-inspector-host';
    this.shadow = this.host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = overlayStyles;
    this.shadow.appendChild(styleEl);

    this.createHighlightBox();
    this.createToastContainer();

    document.documentElement.appendChild(this.host);
  }

  private createHighlightBox(): void {
    if (!this.shadow) return;

    this.highlightBox = document.createElement('div');
    this.highlightBox.className = 'sharedom-highlight-box sharedom-hidden';

    this.highlightTag = document.createElement('div');
    this.highlightTag.className = 'sharedom-highlight-tag';

    this.tagNameEl = document.createElement('span');
    this.tagNameEl.className = 'sharedom-tag-name';

    this.tagClassEl = document.createElement('span');
    this.tagClassEl.className = 'sharedom-tag-class';

    this.tagSizeEl = document.createElement('span');
    this.tagSizeEl.className = 'sharedom-tag-size';

    this.highlightTag.appendChild(this.tagNameEl);
    this.highlightTag.appendChild(this.tagClassEl);
    this.highlightTag.appendChild(this.tagSizeEl);

    this.highlightBox.appendChild(this.highlightTag);
    this.shadow.appendChild(this.highlightBox);
  }

  private createToastContainer(): void {
    if (!this.shadow) return;
    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'sharedom-toast-container';
    this.shadow.appendChild(this.toastContainer);
  }

  public showStatusPill(onClose: () => void, language: ExtensionLanguage = this.language): void {
    if (!this.shadow) return;
    this.language = language;
    const t = translations[this.language].overlay;

    if (this.statusPill) {
      this.statusPill.remove();
    }

    this.statusPill = document.createElement('div');
    this.statusPill.className = 'sharedom-status-pill';

    const dot = document.createElement('div');
    dot.className = 'sharedom-status-dot';

    const title = document.createElement('span');
    title.className = 'sharedom-status-title';
    title.textContent = t.title;

    const promptText = document.createElement('span');
    promptText.style.color = '#a1a1aa';
    promptText.textContent = t.prompt;

    const shortcutGroup = document.createElement('div');
    shortcutGroup.className = 'sharedom-shortcut-group';

    const kbdParent = document.createElement('span');
    kbdParent.className = 'sharedom-kbd';
    kbdParent.textContent = t.parent;

    const kbdCapture = document.createElement('span');
    kbdCapture.className = 'sharedom-kbd';
    kbdCapture.textContent = t.capture;

    const kbdEsc = document.createElement('span');
    kbdEsc.className = 'sharedom-kbd';
    kbdEsc.textContent = t.exit;

    shortcutGroup.appendChild(kbdParent);
    shortcutGroup.appendChild(kbdCapture);
    shortcutGroup.appendChild(kbdEsc);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'sharedom-close-pill-btn';
    closeBtn.setAttribute('title', `${t.exit}`);
    closeBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClose();
    });

    this.statusPill.appendChild(dot);
    this.statusPill.appendChild(title);
    this.statusPill.appendChild(promptText);
    this.statusPill.appendChild(shortcutGroup);
    this.statusPill.appendChild(closeBtn);

    this.shadow.appendChild(this.statusPill);
  }

  public hideStatusPill(): void {
    if (this.statusPill) {
      this.statusPill.remove();
      this.statusPill = null;
    }
  }

  public showHighlight(element: HTMLElement): void {
    if (!this.highlightBox || !this.highlightTag || !this.tagNameEl || !this.tagClassEl || !this.tagSizeEl) {
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      this.hideHighlight();
      return;
    }

    this.highlightBox.style.top = `${rect.top}px`;
    this.highlightBox.style.left = `${rect.left}px`;
    this.highlightBox.style.width = `${rect.width}px`;
    this.highlightBox.style.height = `${rect.height}px`;
    this.highlightBox.classList.remove('sharedom-hidden');

    const tagName = element.tagName.toLowerCase();
    this.tagNameEl.textContent = tagName;

    let classDesc = '';
    if (element.id) {
      classDesc += `#${element.id}`;
    }
    if (element.classList && element.classList.length > 0) {
      const classes = Array.from(element.classList).slice(0, 2).map(c => `.${c}`).join('');
      classDesc += classes;
    }
    this.tagClassEl.textContent = classDesc;

    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    this.tagSizeEl.textContent = `${width} × ${height}`;

    if (rect.top < 32) {
      this.highlightTag.classList.add('flipped-down');
    } else {
      this.highlightTag.classList.remove('flipped-down');
    }
  }

  public hideHighlight(): void {
    if (this.highlightBox) {
      this.highlightBox.classList.add('sharedom-hidden');
    }
  }

  public showToast(message: string, icon = '✓'): void {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'sharedom-toast';

    const iconSpan = document.createElement('span');
    iconSpan.style.color = '#38bdf8';
    iconSpan.style.fontWeight = '700';
    iconSpan.textContent = icon;

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(() => toast.remove(), 260);
    }, 2400);
  }

  public getShadowRoot(): ShadowRoot | null {
    return this.shadow;
  }

  public getHostElement(): HTMLElement | null {
    return this.host;
  }

  public destroy(): void {
    if (this.host && this.host.parentNode) {
      this.host.remove();
    }
    this.host = null;
    this.shadow = null;
    this.statusPill = null;
    this.highlightBox = null;
    this.toastContainer = null;
  }
}
