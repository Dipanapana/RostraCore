'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { SUPPORTED_LOCALES, LOCALE_NAMES } from '@/i18n/config';
import type { SupportedLocale } from '@/i18n/config';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLocaleChange(newLocale: SupportedLocale) {
    // Set cookie for SSR locale detection
    document.cookie = `locale=${newLocale};path=/;max-age=${365 * 24 * 60 * 60}`;

    // Also store in localStorage for Tauri desktop fallback
    try {
      localStorage.setItem('locale', newLocale);
    } catch {}

    setIsOpen(false);

    // Refresh the page to apply the new locale
    router.refresh();
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg
                   hover:bg-gray-100 dark:hover:bg-gray-700
                   text-gray-700 dark:text-gray-300
                   transition-colors"
        aria-label="Select language"
      >
        <Globe className="w-4 h-4" />
        <span>{LOCALE_NAMES[locale]}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 rounded-lg border
                        border-gray-200 dark:border-gray-600
                        bg-white dark:bg-gray-800
                        shadow-lg z-50">
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={`w-full text-left px-4 py-2 text-sm
                hover:bg-gray-100 dark:hover:bg-gray-700
                first:rounded-t-lg last:rounded-b-lg
                ${loc === locale
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300'
                }`}
            >
              {LOCALE_NAMES[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
