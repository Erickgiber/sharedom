import { getLanguage, getLanguageOption, setLanguage, onLanguageChange, Language } from '../i18n';
import { FLAGS } from '../i18n/flags';

export function initNavbar(container: HTMLElement): void {
  function closeLangMenu(): void {
    const select = document.getElementById('langSelect');
    const trigger = document.getElementById('langSelectTrigger');
    if (!select || !trigger) return;
    select.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function toggleLangMenu(): void {
    const select = document.getElementById('langSelect');
    const trigger = document.getElementById('langSelectTrigger');
    if (!select || !trigger) return;
    const isOpen = select.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(isOpen));
  }

  /** Only the selection state moves; the option labels are static markup. */
  function syncActiveLanguage(): void {
    const current = getLanguage();
    const active = getLanguageOption(current);

    const flag = container.querySelector('.lang-select-trigger .lang-flag');
    const abbr = container.querySelector('.lang-select-trigger .lang-abbr');
    if (flag) flag.innerHTML = FLAGS[active.country];
    if (abbr) abbr.textContent = active.abbr;

    container.querySelectorAll<HTMLButtonElement>('.lang-option').forEach((option) => {
      const isActive = option.dataset.lang === current;
      option.classList.toggle('active', isActive);
      option.setAttribute('aria-checked', String(isActive));
    });
  }

  document.getElementById('langSelectTrigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLangMenu();
  });

  container.querySelectorAll<HTMLButtonElement>('.lang-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.lang as Language | undefined;
      closeLangMenu();
      if (next && next !== getLanguage()) setLanguage(next);
    });
  });

  syncActiveLanguage();
  onLanguageChange(syncActiveLanguage);

  document.addEventListener('click', (e) => {
    const select = document.getElementById('langSelect');
    if (select && !select.contains(e.target as Node)) closeLangMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLangMenu();
  });

  window.addEventListener(
    'scroll',
    () => {
      const nav = document.getElementById('mainNav');
      if (!nav) return;
      if (window.scrollY > 20) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    },
    { passive: true }
  );
}
