import { getLanguage, getLanguageOption, setLanguage, onLanguageChange, Language } from '../i18n';
import { FLAGS } from '../i18n/flags';
import { listen, onCleanup } from '../lifecycle';

export function initLangSelect(root: HTMLElement): void {
  const select = root.querySelector<HTMLElement>('.lang-select');
  const trigger = root.querySelector<HTMLElement>('.lang-select-trigger');
  if (!select || !trigger) return;

  function close(): void {
    select?.classList.remove('open');
    trigger?.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = select.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(open));
  });

  root.querySelectorAll<HTMLButtonElement>('.lang-option').forEach((option) => {
    option.addEventListener('click', () => {
      const next = option.dataset.lang as Language | undefined;
      close();
      if (next && next !== getLanguage()) setLanguage(next);
    });
  });

  function syncActive(): void {
    const current = getLanguage();
    const active = getLanguageOption(current);
    const flag = trigger?.querySelector('.lang-flag');
    const abbr = trigger?.querySelector('.lang-abbr');
    if (flag) flag.innerHTML = FLAGS[active.country];
    if (abbr) abbr.textContent = active.abbr;

    root.querySelectorAll<HTMLButtonElement>('.lang-option').forEach((option) => {
      const isActive = option.dataset.lang === current;
      option.classList.toggle('active', isActive);
      option.setAttribute('aria-checked', String(isActive));
    });
  }

  syncActive();
  onCleanup(onLanguageChange(syncActive));

  listen(document, 'click', (e) => {
    if (!select.contains(e.target as Node)) close();
  });
  listen(document, 'keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}
