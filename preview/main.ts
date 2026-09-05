import { renderNavbar } from './src/components/navbar';
import { renderHero, initHeroAnimation } from './src/components/hero';
import { renderPlayground } from './src/components/playground';
import { renderPdfDemo } from './src/components/pdf-demo';
import { renderTelemetryDemo } from './src/components/telemetry-demo';
import { renderFeatures } from './src/components/features';
import { renderUsage } from './src/components/usage';
import { renderFooter } from './src/components/footer';
import { renderPrivacy } from './src/components/privacy';

import { onLanguageChange, getT } from './src/i18n';
import * as sharedom from 'sharedom';

if (typeof window !== 'undefined') {
  (window as any).sharedom = sharedom;
}

const revealedKeys = new Set<string>();

export function setupScrollAnimations(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          const key = entry.target.getAttribute('data-anim-key');
          if (key) revealedKeys.add(key);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.anim-in').forEach((el, index) => {
    const key = el.getAttribute('data-anim-key') || `anim-el-${index}`;
    if (!el.getAttribute('data-anim-key')) {
      el.setAttribute('data-anim-key', key);
    }

    if (revealedKeys.has(key)) {
      el.classList.add('visible');
    } else if (!el.classList.contains('visible')) {
      observer.observe(el);
    }
  });

  const heroVisual = document.querySelector('.hero-visual');
  if (heroVisual) {
    const heroObs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          initHeroAnimation();
          heroObs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    heroObs.observe(heroVisual);
  }
}

function handleRoute(): void {
  const hash = window.location.hash.toLowerCase();
  const isPrivacy = hash === '#/privacy' || hash === '#privacy';

  const landingContainer = document.getElementById('landing-content');
  const privacyContainer = document.getElementById('privacy-mount');

  if (isPrivacy) {
    if (landingContainer) landingContainer.style.display = 'none';
    if (privacyContainer) {
      privacyContainer.style.display = 'block';
      renderPrivacy(privacyContainer);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const t = getT();
    document.title = t.privacy.metaTitle;
  } else {
    if (privacyContainer) privacyContainer.style.display = 'none';
    if (landingContainer) landingContainer.style.display = 'block';
    const t = getT();
    document.title = t.metaTitle;
    setupScrollAnimations();

    if (hash && hash !== '#' && hash !== '#/' && !hash.startsWith('#/privacy')) {
      const targetId = hash.replace(/^#\/?/, '');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        setTimeout(() => {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    }
  }
}

function initApp(): void {
  const navMount        = document.getElementById('navbar-mount');
  const heroMount       = document.getElementById('hero-mount');
  const playgroundMount = document.getElementById('playground-mount');
  const pdfDemoMount    = document.getElementById('pdf-demo-mount');
  const telemetryMount  = document.getElementById('telemetry-demo-mount');
  const featuresMount   = document.getElementById('features-mount');
  const usageMount      = document.getElementById('usage-mount');
  const footerMount     = document.getElementById('footer-mount');

  if (navMount)        renderNavbar(navMount);
  if (heroMount)       renderHero(heroMount);
  if (playgroundMount) renderPlayground(playgroundMount);
  if (pdfDemoMount)    renderPdfDemo(pdfDemoMount);
  if (telemetryMount)  renderTelemetryDemo(telemetryMount);
  if (featuresMount)   renderFeatures(featuresMount);
  if (usageMount)      renderUsage(usageMount);
  if (footerMount)     renderFooter(footerMount);


  handleRoute();
  window.addEventListener('hashchange', handleRoute);

  onLanguageChange(() => {
    handleRoute();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

