import { initNavbar } from './src/components/navbar';
import { initHero, initHeroAnimation } from './src/components/hero';
import { initPlayground } from './src/components/playground';
import { initPdfDemo } from './src/components/pdf-demo';
import { initTelemetryDemo } from './src/components/telemetry-demo';
import { initFeatures } from './src/components/features';
import { initUsage } from './src/components/usage';
import { initFooter } from './src/components/footer';

import { initI18n } from './src/i18n';
import * as sharedom from 'sharedom';

if (typeof window !== 'undefined') {
  (window as any).sharedom = sharedom;
}

/**
 * The policy used to live on the `#/privacy` hash route. It is a real page at
 * /privacy now, so old links are swapped for the clean URL without leaving a
 * history entry.
 */
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

  document.querySelectorAll('.anim-in').forEach((el) => observer.observe(el));

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

function initApp(): void {
  if (redirectLegacyPrivacyHash()) return;
  window.addEventListener('hashchange', redirectLegacyPrivacyHash);

  initI18n();

  const navMount = document.getElementById('navbar-mount');
  const playgroundMount = document.getElementById('playground-mount');
  const pdfDemoMount = document.getElementById('pdf-demo-mount');
  const featuresMount = document.getElementById('features-mount');
  const usageMount = document.getElementById('usage-mount');
  const footerMount = document.getElementById('footer-mount');

  if (navMount) initNavbar(navMount);
  if (document.getElementById('hero-mount')) initHero();
  if (playgroundMount) initPlayground(playgroundMount);
  if (pdfDemoMount) initPdfDemo(pdfDemoMount);
  if (document.getElementById('telemetry-demo-mount')) initTelemetryDemo();
  if (featuresMount) initFeatures(featuresMount);
  if (usageMount) initUsage(usageMount);
  if (footerMount) initFooter(footerMount);

  setupScrollAnimations();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
