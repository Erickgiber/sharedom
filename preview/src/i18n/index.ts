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

const LANGUAGES: readonly LanguageOption[] = [
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

function resolve(t: Translations, path: string): string | undefined {
  let node: unknown = t;
  for (const key of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return typeof node === 'string' ? node : undefined;
}

function setMeta(selector: string, content: string): void {
  const tag = document.querySelector<HTMLMetaElement>(selector);
  if (tag) tag.content = content;
}

function applyTranslations(lang: Language = currentLang): void {
  if (typeof document === 'undefined') return;
  const t = translations[lang];

  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const path = el.dataset.i18n;
    const value = path === undefined ? undefined : resolve(t, path);
    if (value !== undefined) el.textContent = value;
  }

  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-attr]')) {
    for (const pair of (el.dataset.i18nAttr ?? '').split(',')) {
      const separator = pair.indexOf(':');
      if (separator === -1) continue;
      const value = resolve(t, pair.slice(separator + 1));
      if (value !== undefined) el.setAttribute(pair.slice(0, separator), value);
    }
  }

  for (const el of document.querySelectorAll<HTMLInputElement>('[data-i18n-value]')) {
    const path = el.dataset.i18nValue;
    const value = path === undefined ? undefined : resolve(t, path);
    if (value !== undefined) el.value = value + (el.dataset.i18nValueSuffix ?? '');
  }
}

function applyMeta(lang: Language): void {
  if (typeof document === 'undefined') return;
  const t = translations[lang];
  const root = document.documentElement;
  const title = resolve(t, root.dataset.metaTitle ?? 'metaTitle') ?? t.metaTitle;
  const description = resolve(t, root.dataset.metaDescription ?? 'metaDescription') ?? t.metaDescription;

  document.title = title;
  root.lang = lang;

  setMeta('meta[name="title"]', title);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[name="twitter:title"]', title);

  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[name="twitter:description"]', description);
}

type Listener = (lang: Language, t: Translations) => void;
const listeners = new Set<Listener>();

export function initI18n(): void {
  applyMeta(currentLang);
  if (currentLang !== 'en') applyTranslations(currentLang);
}

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
  applyTranslations(lang);
  listeners.forEach((listener) => listener(currentLang, translations[currentLang]));
}

export function onLanguageChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
