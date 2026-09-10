import { en } from './en';
import { es } from './es';
import { zh } from './zh';
import { ja } from './ja';
import { pt } from './pt';
import { de } from './de';
import { ko } from './ko';
import { ru } from './ru';
import { CountryCode } from './flags';

export type Language = 'en' | 'es' | 'zh' | 'ja' | 'pt' | 'de' | 'ko' | 'ru';
export type Translations = typeof en;

export interface LanguageOption {
  code: Language;
  abbr: string;
  label: string;
  country: CountryCode;
}

const translations: Record<Language, Translations> = { en, es, zh, ja, pt, de, ko, ru };

export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'en', abbr: 'EN', label: 'English', country: 'gb' },
  { code: 'es', abbr: 'ES', label: 'Español', country: 'es' },
  { code: 'zh', abbr: 'ZH', label: '中文', country: 'cn' },
  { code: 'ja', abbr: 'JA', label: '日本語', country: 'jp' },
  { code: 'pt', abbr: 'PT', label: 'Português', country: 'pt' },
  { code: 'de', abbr: 'DE', label: 'Deutsch', country: 'de' },
  { code: 'ko', abbr: 'KO', label: '한국어', country: 'kr' },
  { code: 'ru', abbr: 'RU', label: 'Русский', country: 'ru' },
];

const STORAGE_KEY = 'sharedom_lang';

function isLanguage(value: string | null): value is Language {
  return value !== null && value in translations;
}

function readStoredLanguage(): Language {
  if (typeof localStorage === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  return isLanguage(stored) ? stored : 'en';
}

let currentLang: Language = readStoredLanguage();

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

export function getLanguageOption(lang: Language = currentLang): LanguageOption {
  return LANGUAGES.find((option) => option.code === lang) ?? LANGUAGES[0];
}

export function getT(): Translations {
  return translations[currentLang];
}

export function setLanguage(lang: Language): void {
  currentLang = lang;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang);
  }
  applyMeta(lang);
  listeners.forEach((listener) => listener(currentLang, translations[currentLang]));
}

export function onLanguageChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
