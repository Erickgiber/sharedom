import { initNavbar } from './src/components/navbar';
import { initLangSelect } from './src/components/lang-select';
import { initHero, initHeroAnimation } from './src/components/hero';
import { initPlayground } from './src/components/playground';
import { initPdfDemo } from './src/components/pdf-demo';
import { initTelemetryDemo } from './src/components/telemetry-demo';
import { initFeatures } from './src/components/features';
import { initUsage } from './src/components/usage';
import { initFooter } from './src/components/footer';

import { initI18n } from './src/i18n';
import { initRouter } from './src/router';
import { observe, onCleanup } from './src/lifecycle';
import * as sharedom from 'sharedom';

if (typeof window !== 'undefined') {
  (window as any).sharedom = sharedom;
}

const PRIVACY_HASHES = ['#/privacy', '#privacy'];

function redirectLegacyPrivacyHash(): boolean {
  if (!PRIVACY_HASHES.includes(window.location.hash.toLowerCase())) return false;
  window.location.replace(new URL('privacy', window.location.href.split('#')[0]).href);
  return true;
}

function setupScrollAnimations(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  observe(observer);

  let cancelled = false;
  onCleanup(() => {
    cancelled = true;
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (cancelled) return;
      document.querySelectorAll('.anim-in').forEach((el) => observer.observe(el));
    });
  });

  const heroVisual = document.querySelector('.hero-visual');
  if (!heroVisual) return;
  const heroObs = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        initHeroAnimation();
        heroObs.disconnect();
      }
    },
    { threshold: 0.2 }
  );
  observe(heroObs);
  heroObs.observe(heroVisual);
}

let generation = 0;

function mountPage(): void {
  const current = ++generation;
  initI18n();

  const navMount = document.getElementById('navbar-mount');
  const langBar = document.getElementById('langbar');
  const playgroundMount = document.getElementById('playground-mount');
  const pdfDemoMount = document.getElementById('pdf-demo-mount');
  const featuresMount = document.getElementById('features-mount');
  const usageMount = document.getElementById('usage-mount');
  const footerMount = document.getElementById('footer-mount');

  if (navMount) initNavbar(navMount);
  if (langBar) initLangSelect(langBar);
  if (document.getElementById('hero-mount')) initHero();
  if (playgroundMount) initPlayground(playgroundMount);
  if (pdfDemoMount) initPdfDemo(pdfDemoMount);
  if (document.getElementById('telemetry-demo-mount')) initTelemetryDemo();
  if (featuresMount) initFeatures(featuresMount);
  if (usageMount) initUsage(usageMount);
  if (footerMount) initFooter(footerMount);

  if (document.getElementById('scene')) {
    void import('./src/components/space').then(({ initSpace }) => {
      if (current !== generation) return;
      onCleanup(initSpace());
    });
  }

  setupScrollAnimations();
}

function initApp(): void {
  if (redirectLegacyPrivacyHash()) return;
  window.addEventListener('hashchange', redirectLegacyPrivacyHash);

  initRouter(mountPage);
  mountPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
