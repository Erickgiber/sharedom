import { getT, onLanguageChange } from '../i18n';

export function renderPrivacy(container: HTMLElement): void {
  function update(): void {
    const t = getT();
    const p = t.privacy;

    container.innerHTML = `
      <section class="privacy-section">
        <div class="privacy-container">
          <!-- Navigation / Back -->
          <div class="privacy-nav-bar">
            <a href="#" class="privacy-back-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>${p.backHome}</span>
            </a>
            <div class="privacy-badge">
              <span class="privacy-badge-dot"></span>
              <span>${p.badge}</span>
            </div>
          </div>

          <!-- Header -->
          <div class="privacy-header">
            <h1 class="privacy-title">${p.title}</h1>
            <p class="privacy-last-updated">${p.lastUpdated}</p>
            <p class="privacy-lead">${p.introText}</p>
          </div>

          <!-- Card 1: Single Purpose -->
          <div class="privacy-card">
            <div class="privacy-card-header">
              <div class="privacy-card-icon">🎯</div>
              <h2 class="privacy-card-title">${p.singlePurposeTitle}</h2>
            </div>
            <p class="privacy-card-text">${p.singlePurposeText}</p>
          </div>

          <!-- Card 2: Zero Data Collection -->
          <div class="privacy-card">
            <div class="privacy-card-header">
              <div class="privacy-card-icon">🛡️</div>
              <h2 class="privacy-card-title">${p.dataCollectionTitle}</h2>
            </div>
            <ul class="privacy-list">
              ${p.dataCollectionPoints
                .map(
                  (pt) => `
                <li class="privacy-list-item">
                  <span class="privacy-check-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>${pt}</span>
                </li>
              `
                )
                .join('')}
            </ul>
          </div>

          <!-- Card 3: Permissions Justification -->
          <div class="privacy-card">
            <div class="privacy-card-header">
              <div class="privacy-card-icon">🔑</div>
              <h2 class="privacy-card-title">${p.permissionsTitle}</h2>
            </div>
            <p class="privacy-card-text">${p.permissionsIntro}</p>
            <div class="privacy-permissions-grid">
              ${p.permissions
                .map(
                  (perm) => `
                <div class="privacy-perm-box">
                  <div class="privacy-perm-name">
                    <code>${perm.name}</code>
                  </div>
                  <p class="privacy-perm-desc">${perm.desc}</p>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Card 4: Third Party & Remote Code -->
          <div class="privacy-card">
            <div class="privacy-card-header">
              <div class="privacy-card-icon">🚫</div>
              <h2 class="privacy-card-title">${p.thirdPartyTitle}</h2>
            </div>
            <p class="privacy-card-text">${p.thirdPartyText}</p>
          </div>

          <!-- Card 5: Open Source & Contact -->
          <div class="privacy-card">
            <div class="privacy-card-header">
              <div class="privacy-card-icon">📖</div>
              <h2 class="privacy-card-title">${p.openSourceTitle}</h2>
            </div>
            <p class="privacy-card-text">
              ${p.openSourceText} 
              <a href="https://github.com/Erickgiber/sharedom" target="_blank" rel="noopener noreferrer" class="privacy-link">
                github.com/Erickgiber/sharedom ↗
              </a>.
            </p>
            <div class="privacy-contact-box">
              <h3 class="privacy-contact-title">${p.contactTitle}</h3>
              <p class="privacy-card-text">${p.contactText}</p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  update();
  onLanguageChange(() => update());
}
