import { en } from './en';
import { es } from './es';

export type Language = 'en' | 'es';
export type Translations = typeof en;

const translations: Record<Language, Translations> = { en, es };

let currentLang: Language = (localStorage.getItem('sharedom_lang') as Language) || 'en';

function applyMeta(lang: Language): void {
  if (typeof document === 'undefined') return;
  const t = translations[lang];
  document.title = t.metaTitle;
  document.documentElement.lang = lang;

  const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (metaDesc) metaDesc.content = t.metaDescription;

  const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = t.metaDescription;

  const twitterDesc = document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.content = t.metaDescription;
}

if (typeof document !== 'undefined') {
  applyMeta(currentLang);
}

type Listener = (lang: Language, t: Translations) => void;
const listeners = new Set<Listener>();

export function getLanguage(): Language {
  return currentLang;
}

export function getT(): Translations {
  return translations[currentLang];
}

export function setLanguage(lang: Language): void {
  currentLang = lang;
  localStorage.setItem('sharedom_lang', lang);
  applyMeta(lang);
  listeners.forEach((listener) => listener(currentLang, translations[currentLang]));
}

export function onLanguageChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
