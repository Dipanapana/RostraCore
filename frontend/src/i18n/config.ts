export const SUPPORTED_LOCALES = ['en', 'af', 'zu'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  af: 'Afrikaans',
  zu: 'isiZulu',
};
