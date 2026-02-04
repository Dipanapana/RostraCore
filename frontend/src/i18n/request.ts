import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './config';
import type { SupportedLocale } from './config';

// Import message files statically so Next.js can resolve them at build time
import enMessages from '../messages/en.json';
import afMessages from '../messages/af.json';
import zuMessages from '../messages/zu.json';

const messages = {
  en: enMessages,
  af: afMessages,
  zu: zuMessages,
};

export default getRequestConfig(async () => {
  // Read locale from cookie (set by LanguageSelector)
  let locale: SupportedLocale = DEFAULT_LOCALE;

  try {
    const store = await cookies();
    const rawLocale = store.get('locale')?.value;
    if (rawLocale && SUPPORTED_LOCALES.includes(rawLocale as SupportedLocale)) {
      locale = rawLocale as SupportedLocale;
    }
  } catch {
    // Cookie reading may fail in static export / Tauri desktop
    // Fall back to default locale
  }

  return {
    locale,
    messages: messages[locale],
  };
});
