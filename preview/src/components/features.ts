import { getT, onLanguageChange } from '../i18n';

export function renderFeatures(container: HTMLElement): void {
  function update(): void {
    const t = getT();

    container.innerHTML = `
      <section class="features" id="features">
        <div class="section-header anim-in" data-anim-key="features-header">
          <h2>${t.features.title}</h2>
          <p>${t.features.subtitle}</p>
        </div>

        <div class="features-grid">
          <!-- 1. Client & SSR Native -->
          <div class="feature-card anim-in" style="transition-delay:0ms" data-anim-key="feat-1">
            <div class="feature-card-content">
              <div class="feature-icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </div>
              <div class="feature-title">${t.features.f1Title}</div>
              <div class="feature-desc">${t.features.f1Desc}</div>
            </div>
          </div>

          <!-- 2. Element or selector -->
          <div class="feature-card anim-in" style="transition-delay:80ms" data-anim-key="feat-2">
            <div class="feature-card-content">
              <div class="feature-icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="6"></circle>
                  <circle cx="12" cy="12" r="2"></circle>
                </svg>
              </div>
              <div class="feature-title">${t.features.f2Title}</div>
              <div class="feature-desc">${t.features.f2Desc}</div>
            </div>
          </div>

          <!-- 3. PNG · JPEG · WebP -->
          <div class="feature-card anim-in" style="transition-delay:160ms" data-anim-key="feat-3">
            <div class="feature-card-content">
              <div class="feature-icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
              <div class="feature-title">${t.features.f3Title}</div>
              <div class="feature-desc">${t.features.f3Desc}</div>
            </div>
          </div>

          <!-- 4. Retina & 4K Ready -->
          <div class="feature-card anim-in" style="transition-delay:240ms" data-anim-key="feat-4">
            <div class="feature-card-content">
              <div class="feature-icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 3h6v6"></path>
                  <path d="M9 21H3v-6"></path>
                  <path d="M21 3l-7 7"></path>
                  <path d="M3 21l7-7"></path>
                  <rect x="8" y="8" width="8" height="8" rx="1.5"></rect>
                </svg>
              </div>
              <div class="feature-title">${t.features.f4Title}</div>
              <div class="feature-desc">${t.features.f4Desc}</div>
            </div>
          </div>

          <!-- 5. CORS & Image Inlining -->
          <div class="feature-card anim-in" style="transition-delay:320ms" data-anim-key="feat-5">
            <div class="feature-card-content">
              <div class="feature-icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                  <path d="M16 16h5v5"></path>
                </svg>
              </div>
              <div class="feature-title">${t.features.f5Title}</div>
              <div class="feature-desc">${t.features.f5Desc}</div>
            </div>
          </div>

          <!-- 6. TypeScript First -->
          <div class="feature-card anim-in" style="transition-delay:400ms" data-anim-key="feat-6">
            <div class="feature-card-content">
              <div class="feature-icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
              </div>
              <div class="feature-title">${t.features.f6Title}</div>
              <div class="feature-desc">${t.features.f6Desc}</div>
            </div>
          </div>
        </div>
      </section>
    `;

    bind3dFeatureCards();
  }

  function bind3dFeatureCards(): void {
    const cards = container.querySelectorAll<HTMLElement>('.feature-card');
    cards.forEach((card) => {
      function handleMouseMove(e: MouseEvent): void {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const deltaX = (x - centerX) / centerX;
        const deltaY = (y - centerY) / centerY;

        const maxTilt = 10;
        const rotateY = (deltaX * maxTilt).toFixed(2);
        const rotateX = (-deltaY * maxTilt).toFixed(2);

        card.style.setProperty('--mouse-x', `${((x / rect.width) * 100).toFixed(1)}%`);
        card.style.setProperty('--mouse-y', `${((y / rect.height) * 100).toFixed(1)}%`);
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
      }

      function handleMouseEnter(): void {
        card.style.transition = 'transform 0.08s ease-out, border-color 0.3s ease, box-shadow 0.3s ease';
      }

      function handleMouseLeave(): void {
        card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.3s ease';
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        card.style.removeProperty('--mouse-x');
        card.style.removeProperty('--mouse-y');
      }

      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseenter', handleMouseEnter);
      card.addEventListener('mouseleave', handleMouseLeave);
    });
  }

  update();
  onLanguageChange(() => update());
}
