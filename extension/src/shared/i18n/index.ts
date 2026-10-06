import { de } from './de';
import { en } from './en';
import { es } from './es';
import { ja } from './ja';
import { ko } from './ko';
import { pt } from './pt';
import { ru } from './ru';
import { zh } from './zh';
import { ExtensionLanguage, ExtensionTranslations, LANGUAGE_OPTIONS, LanguageOption } from './types';

export type {
  ExtensionLanguage,
  ExtensionTranslations,
  LanguageOption,
  ModalTranslations,
  OverlayTranslations,
  PopupTranslations,
  RecorderTranslations,
  WhatsNewTranslations,
} from './types';
export { LANGUAGE_OPTIONS } from './types';

export const translations: Record<ExtensionLanguage, ExtensionTranslations> = {
  en,
  es,
  zh,
  ja,
  pt,
  de,
  ko,
  ru,
};

export const DEFAULT_LANGUAGE: ExtensionLanguage = 'en';

export function normalizeLanguage(value: unknown): ExtensionLanguage {
  return typeof value === 'string' && value in translations
    ? (value as ExtensionLanguage)
    : DEFAULT_LANGUAGE;
}

export function getLanguageOption(lang: ExtensionLanguage): LanguageOption {
  return LANGUAGE_OPTIONS.find((option) => option.code === lang) ?? LANGUAGE_OPTIONS[0];
}
