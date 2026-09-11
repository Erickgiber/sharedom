import { initLangSelect } from './lang-select';
import { listen } from '../lifecycle';

export function initNavbar(container: HTMLElement): void {
  initLangSelect(container);

  listen(
    window,
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
