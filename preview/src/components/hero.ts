import { getT, onLanguageChange } from '../i18n';
import { showToast } from './toast';

let isHeroAnimated = false;

export function renderHero(container: HTMLElement): void {
  function update(): void {
    const t = getT();

    container.innerHTML = `
      <section class="hero">
        <div class="hero-glow"></div>
        <div class="hero-inner anim-in" data-anim-key="hero-inner">
          <a href="https://chromewebstore.google.com/detail/sharedom-dom-screenshot-i/nnpbohgnnkkagbbfjeknpeokbppddjnm" target="_blank" rel="noopener noreferrer" class="hero-extension-pill" title="${t.hero.extensionAvailable}">
            <span class="pill-badge">${t.hero.extensionPill}</span>
            <span class="pill-text">${t.hero.extensionAvailable}</span>
            <svg class="pill-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </a>
          <h1>${t.hero.titleMain} <em>${t.hero.titleEm}</em><br>${t.hero.titleEnd}</h1>
          <p class="hero-sub">${t.hero.subtitle}</p>
          <div class="hero-actions">
            <a href="#usage" class="btn-primary">${t.hero.readDocs}</a>
            <button type="button" class="btn-ghost" id="copyNpmBtn" aria-label="Copy npm install command">
              <span>${t.hero.copyCommand}</span>
              <svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>

          <div class="hero-links">
            <a href="https://chromewebstore.google.com/detail/sharedom-dom-screenshot-i/nnpbohgnnkkagbbfjeknpeokbppddjnm" target="_blank" rel="noopener noreferrer" class="hero-link">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 8h8.5"></path>
                <path d="M8.5 14 4.2 6.9"></path>
                <path d="M15.5 14 11.2 21.9"></path>
              </svg>
              <span>${t.hero.linkExtension}</span>
            </a>
            <a href="https://www.npmjs.com/package/sharedom" target="_blank" rel="noopener noreferrer" class="hero-link">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M2 4.5h20v13h-10v2.5H7.5v-2.5H2v-13Zm2.2 10.8h2.2V8.7h2.2v6.6h2.2V6.7H4.2v8.6Zm8.6-8.6v10.8h2.2v-2.2h4.4V6.7h-6.6Zm2.2 2.2h2.2v4.4h-2.2V8.9Z"></path>
              </svg>
              <span>${t.hero.linkNpm}</span>
            </a>
            <a href="https://github.com/Erickgiber/sharedom" target="_blank" rel="noopener noreferrer" class="hero-link">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.5v-1.7c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.02-2.75-.1-.26-.44-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.54 1.41.2 2.45.1 2.71.64.72 1.02 1.63 1.02 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9v2.82c0 .28.18.6.69.5A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"></path>
              </svg>
              <span>${t.hero.linkGithub}</span>
            </a>
          </div>
        </div>

        <div class="hero-visual anim-in" style="transition-delay:200ms" data-anim-key="hero-visual">
          <div class="browser-glow" id="browserGlow" style="${isHeroAnimated ? 'opacity:1;' : ''}"></div>
          <div class="browser" id="heroBrowser" style="${isHeroAnimated ? 'transform:perspective(900px) rotateX(4deg);' : ''}">
            <div class="browser-bar">
              <div class="dot dot-r"></div>
              <div class="dot dot-y"></div>
              <div class="dot dot-g"></div>
              <div class="url-bar"><span>${t.mockup.url}</span></div>
            </div>
            <div class="browser-body">
              <div class="fake-line" style="width:80%;${isHeroAnimated ? 'opacity:1;' : 'transition-delay:.5s'}" id="l1"></div>
              <div class="fake-line" style="width:60%;${isHeroAnimated ? 'opacity:1;' : 'transition-delay:.6s'}" id="l2"></div>
              <div class="fake-line" style="width:90%;${isHeroAnimated ? 'opacity:1;' : 'transition-delay:.7s'}" id="l3"></div>
              <div class="fake-line" style="width:45%;${isHeroAnimated ? 'opacity:1;' : 'transition-delay:.8s'}" id="l4"></div>
              <div class="fake-line" style="width:70%;${isHeroAnimated ? 'opacity:1;' : 'transition-delay:.9s'}" id="l5"></div>
              <div class="fake-btns">
                <div class="fake-btn fake-btn-1" style="${isHeroAnimated ? 'opacity:1;' : 'transition-delay:1s'}" id="b1"></div>
                <div class="fake-btn fake-btn-2" style="${isHeroAnimated ? 'opacity:1;' : 'transition-delay:1.1s'}" id="b2"></div>
              </div>
            </div>
            <div class="flash-overlay" id="flashOverlay"></div>
          </div>

          <div class="screenshot-badge" id="screenshotBadge" style="${isHeroAnimated ? 'opacity:1;transform:translateY(0) scale(1);' : ''}">
            <div class="badge-title" id="badgeTitle">${t.mockup.outputFile}</div>
            <div class="badge-lines" id="badgePreviewContainer">
              <div class="badge-line" style="width:80%"></div>
              <div class="badge-line" style="width:60%"></div>
              <div class="badge-line" style="width:90%"></div>
              <div class="badge-line" style="width:45%"></div>
            </div>
          </div>
        </div>
      </section>
    `;

    document.getElementById('copyNpmBtn')?.addEventListener('click', () => {
      navigator.clipboard.writeText('npm i sharedom');
      showToast(t.toast.copiedNpm);
    });

    bind3dParallax();
  }

  update();
  onLanguageChange(() => update());
}

function bind3dParallax(): void {
  const visual = document.querySelector<HTMLElement>('.hero-visual');
  const browser = document.getElementById('heroBrowser');
  const glow = document.getElementById('browserGlow');
  const badge = document.getElementById('screenshotBadge');

  if (!visual || !browser) return;

  let rafId = 0;
  let targetRotateX = 4;
  let targetRotateY = 0;
  let currentRotateX = 4;
  let currentRotateY = 0;
  let isHovered = false;

  function step(): void {
    currentRotateX += (targetRotateX - currentRotateX) * 0.1;
    currentRotateY += (targetRotateY - currentRotateY) * 0.1;

    const scale = isHovered ? 1.025 : 1;
    if (browser) {
      browser.style.transform = `perspective(900px) rotateX(${currentRotateX.toFixed(2)}deg) rotateY(${currentRotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
    }

    if (glow) {
      glow.style.transform = `translate(${(-currentRotateY * 3).toFixed(1)}px, ${(currentRotateX * 2).toFixed(1)}px)`;
    }

    if (badge) {
      const badgeShiftX = (-currentRotateY * 2).toFixed(1);
      const badgeShiftY = (currentRotateX * 1.5).toFixed(1);
      badge.style.transform = `translate(${badgeShiftX}px, ${badgeShiftY}px) scale(1)`;
    }

    if (
      isHovered ||
      Math.abs(targetRotateX - currentRotateX) > 0.05 ||
      Math.abs(targetRotateY - currentRotateY) > 0.05
    ) {
      rafId = requestAnimationFrame(step);
    }
  }

  visual.addEventListener('mousemove', (e) => {
    if (!isHeroAnimated) return;
    const rect = visual.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const percentX = (x - centerX) / centerX;
    const percentY = (y - centerY) / centerY;

    const maxTilt = 12;
    targetRotateY = percentX * maxTilt;
    targetRotateX = -percentY * maxTilt + 4;

    if (!isHovered) {
      isHovered = true;
      browser.style.transition = 'none';
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(step);
    }
  });

  visual.addEventListener('mouseenter', () => {
    if (!isHeroAnimated) return;
    isHovered = true;
    browser.style.transition = 'none';
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(step);
  });

  visual.addEventListener('mouseleave', () => {
    isHovered = false;
    targetRotateX = 4;
    targetRotateY = 0;
  });
}

export function initHeroAnimation(): void {
  if (isHeroAnimated) return;

  const glow = document.getElementById('browserGlow');
  const browser = document.getElementById('heroBrowser');
  const flash = document.getElementById('flashOverlay');
  const badge = document.getElementById('screenshotBadge');
  const lines = ['l1', 'l2', 'l3', 'l4', 'l5', 'b1', 'b2'];

  setTimeout(() => {
    if (glow) glow.style.opacity = '1';
  }, 400);

  setTimeout(() => {
    if (browser) browser.style.transform = 'perspective(900px) rotateX(4deg)';
  }, 500);

  lines.forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.style.opacity = '1';
    }, 500 + i * 100);
  });

  setTimeout(() => {
    if (flash) {
      flash.style.transition = 'opacity .4s ease';
      flash.style.opacity = '1';
      setTimeout(() => {
        flash.style.opacity = '0';
      }, 350);
    }
  }, 1400);

  setTimeout(() => {
    if (badge) {
      badge.style.opacity = '1';
      badge.style.transform = 'translateY(0) scale(1)';
    }
    isHeroAnimated = true;
    bind3dParallax();
  }, 1800);
}
