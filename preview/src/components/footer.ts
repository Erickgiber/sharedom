import { getT, onLanguageChange } from '../i18n';
import logoUrl from '../../public/logo.svg';

export function renderFooter(container: HTMLElement): void {
  function update(): void {
    const t = getT();
    const currentYear = new Date().getFullYear();

    container.innerHTML = `
      <footer>
        <div class="footer-logo">
          <a href="#" class="footer-logo-link" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; color: inherit;">
            <img src="${logoUrl}" alt="ShareDOM logo" width="20" height="20" />
            <span class="logo-name">ShareDOM</span>
          </a>
        </div>
        <div class="footer-links">
          <a href="#/privacy" class="footer-privacy-link">${t.footer.privacy}</a>
          <a href="https://chromewebstore.google.com/detail/sharedom-dom-screenshot-i/nnpbohgnnkkagbbfjeknpeokbppddjnm" target="_blank" rel="noopener noreferrer">Chrome Extension ↗</a>
          <a href="https://www.paypal.com/ncp/payment/62GKBN5BDSAWL" target="_blank" rel="noopener" class="footer-coffee-link">☕ ${t.nav.buyCoffee.replace('☕ ', '')}</a>
          <a href="https://www.npmjs.com/package/sharedom" target="_blank" rel="noopener">NPM ↗</a>
          <a href="https://github.com/Erickgiber/sharedom" target="_blank" rel="noopener">GitHub ↗</a>
        </div>
        <span class="footer-license">
          ${t.footer.license} · ${t.footer.builtWith} <span class="footer-heart" aria-label="love"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span> ${t.footer.by} Erickgiber · ${currentYear}
        </span>
      </footer>
    `;
  }

  update();
  onLanguageChange(() => update());
}
