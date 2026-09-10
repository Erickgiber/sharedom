import { getT, getLanguage, getLanguageOption, setLanguage, onLanguageChange, LANGUAGES, Language } from '../i18n';
import { FLAGS } from '../i18n/flags';
import logoUrl from '../../public/logo.svg';

export function renderNavbar(container: HTMLElement): void {
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

  function update(): void {
    const t = getT();
    const currentLang = getLanguage();
    const active = getLanguageOption(currentLang);
    const isScrolled = window.scrollY > 20;

    const options = LANGUAGES.map(
      (option) => `
        <button type="button" role="menuitemradio" aria-checked="${option.code === currentLang}"
          class="lang-option ${option.code === currentLang ? 'active' : ''}" data-lang="${option.code}">
          <span class="lang-flag">${FLAGS[option.country]}</span>
          <span class="lang-abbr">${option.abbr}</span>
          <span class="lang-name">${option.label}</span>
        </button>`
    ).join('');

    container.innerHTML = `
      <nav class="nav ${isScrolled ? 'scrolled' : ''}" id="mainNav">
        <a href="#" class="nav-logo">
          <img src="${logoUrl}" alt="ShareDOM logo" class="nav-logo-img" width="32" height="32" />
          <span class="nav-logo-text">ShareDOM</span>
        </a>

        <div class="nav-links">
          <a href="#playground">${t.nav.playground}</a>
          <a href="#pdf-demo">${t.nav.pdfDemo}</a>
          <a href="#telemetry-demo">${t.nav.telemetry}</a>
          <a href="#features">${t.nav.features}</a>
          <a href="#usage">${t.nav.usage}</a>
        </div>

        <div class="nav-right">
          <a href="https://www.paypal.com/ncp/payment/62GKBN5BDSAWL" target="_blank" rel="noopener noreferrer" class="nav-coffee-btn" title="${t.nav.buyCoffee}">
            ${t.nav.buyCoffee}
          </a>
          <div class="lang-select" id="langSelect">
            <button type="button" class="lang-select-trigger" id="langSelectTrigger"
              aria-haspopup="menu" aria-expanded="false" title="${t.nav.switchLanguage}">
              <span class="lang-flag">${FLAGS[active.country]}</span>
              <span class="lang-abbr">${active.abbr}</span>
              <svg class="lang-caret" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </button>
            <div class="lang-select-menu" role="menu" aria-label="${t.nav.switchLanguage}">
              ${options}
            </div>
          </div>
        </div>
      </nav>
    `;

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
  }

  update();
  onLanguageChange(() => update());

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
