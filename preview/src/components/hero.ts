import { getT } from '../i18n';
import { showToast } from './toast';

let isHeroAnimated = false;

export function initHero(): void {
  isHeroAnimated = false;

  document.getElementById('copyNpmBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText('npm i sharedom');
    showToast(getT().toast.copiedNpm);
  });

  bind3dParallax();
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
    setTimeout(
      () => {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
      },
      500 + i * 100
    );
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
  }, 1800);
}
