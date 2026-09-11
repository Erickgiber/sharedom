export type CountryCode = 'gb' | 'es' | 'cn' | 'jp' | 'pt' | 'de' | 'kr' | 'ru';

const STAR =
  'M0,-1L0.225,-0.309L0.951,-0.309L0.363,0.118L0.588,0.809L0,0.382L-0.588,0.809L-0.363,0.118L-0.951,-0.309L-0.225,-0.309Z';

const TRIGRAM =
  '<rect x="-2.6" y="-1.5" width="5.2" height="0.85"/><rect x="-2.6" y="-0.42" width="5.2" height="0.85"/><rect x="-2.6" y="0.65" width="5.2" height="0.85"/>';

export const FLAGS: Record<CountryCode, string> = {
  gb: `<svg viewBox="0 0 24 16" role="presentation" focusable="false">
    <rect width="24" height="16" fill="#012169"/>
    <path d="M0,0L24,16M24,0L0,16" stroke="#fff" stroke-width="3.4"/>
    <path d="M0,0L24,16M24,0L0,16" stroke="#C8102E" stroke-width="1.8"/>
    <path d="M12,0V16M0,8H24" stroke="#fff" stroke-width="5.4"/>
    <path d="M12,0V16M0,8H24" stroke="#C8102E" stroke-width="3.2"/>
  </svg>`,
  es: `<svg viewBox="0 0 24 16" role="presentation" focusable="false">
    <rect width="24" height="16" fill="#AA151B"/>
    <rect y="4" width="24" height="8" fill="#F1BF00"/>
  </svg>`,
  cn: `<svg viewBox="0 0 24 16" role="presentation" focusable="false">
    <rect width="24" height="16" fill="#EE1C25"/>
    <g fill="#FFDE00">
      <path d="${STAR}" transform="translate(4.6,4.4) scale(2.7)"/>
      <path d="${STAR}" transform="translate(9.6,1.9) scale(0.9)"/>
      <path d="${STAR}" transform="translate(11.4,4.1) scale(0.9)"/>
      <path d="${STAR}" transform="translate(11.4,6.8) scale(0.9)"/>
      <path d="${STAR}" transform="translate(9.6,8.8) scale(0.9)"/>
    </g>
  </svg>`,
  jp: `<svg viewBox="0 0 24 16" role="presentation" focusable="false">
    <rect width="24" height="16" fill="#fff"/>
    <circle cx="12" cy="8" r="4.6" fill="#BC002D"/>
  </svg>`,
  pt: `<svg viewBox="0 0 24 16" role="presentation" focusable="false">
    <rect width="24" height="16" fill="#DA291C"/>
    <rect width="9.6" height="16" fill="#046A38"/>
    <circle cx="9.6" cy="8" r="3.4" fill="#FFE800"/>
    <circle cx="9.6" cy="8" r="2.1" fill="#DA291C"/>
    <circle cx="9.6" cy="8" r="1" fill="#fff"/>
  </svg>`,
  de: `<svg viewBox="0 0 24 16" role="presentation" focusable="false">
    <rect width="24" height="16" fill="#000"/>
    <rect y="5.34" width="24" height="5.33" fill="#DD0000"/>
    <rect y="10.67" width="24" height="5.33" fill="#FFCE00"/>
  </svg>`,
  kr: `<svg viewBox="0 0 24 16" role="presentation" focusable="false">
    <rect width="24" height="16" fill="#fff"/>
    <circle cx="12" cy="8" r="3.5" fill="#0047A0"/>
    <path d="M8.5,8a1.75,1.75 0 0 1 3.5,0a1.75,1.75 0 0 0 3.5,0a3.5,3.5 0 0 0 -7,0Z" fill="#CD2E3A"/>
    <g fill="#000">
      <g transform="translate(4.4,3.4) rotate(-56)">${TRIGRAM}</g>
      <g transform="translate(19.6,3.4) rotate(56)">${TRIGRAM}</g>
      <g transform="translate(4.4,12.6) rotate(56)">${TRIGRAM}</g>
      <g transform="translate(19.6,12.6) rotate(-56)">${TRIGRAM}</g>
    </g>
  </svg>`,
  ru: `<svg viewBox="0 0 24 16" role="presentation" focusable="false">
    <rect width="24" height="16" fill="#fff"/>
    <rect y="5.34" width="24" height="5.33" fill="#0039A6"/>
    <rect y="10.67" width="24" height="5.33" fill="#D52B1E"/>
  </svg>`,
};
