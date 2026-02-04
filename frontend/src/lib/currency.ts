/**
 * Currency formatting utilities for multi-currency support.
 *
 * LOCKED DECISION: Currency format follows the currency's origin country,
 * not the user's locale. ZAR always displays as "R 1 234,56" (SA format),
 * USD always displays as "$1,234.56" (US format), etc.
 *
 * Uses Intl.NumberFormat with currency-specific locale for formatting.
 */

// Map of currency code -> locale for formatting (origin-country locale)
export const CURRENCY_LOCALE_MAP: Record<string, string> = {
  ZAR: 'en-ZA',   // South African Rand
  USD: 'en-US',   // US Dollar
  GBP: 'en-GB',   // British Pound
  EUR: 'de-DE',   // Euro (German convention as default)
  NGN: 'en-NG',   // Nigerian Naira
  KES: 'en-KE',   // Kenyan Shilling
  INR: 'en-IN',   // Indian Rupee
  JPY: 'ja-JP',   // Japanese Yen (0 decimal places)
  KWD: 'ar-KW',   // Kuwaiti Dinar (3 decimal places)
};

/**
 * Format a monetary amount using the currency's origin-country locale.
 *
 * @param amount - The numeric amount to format
 * @param currencyCode - ISO 4217 currency code (e.g., 'ZAR', 'USD')
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, 'ZAR')  // "R 1 234,56"
 * formatCurrency(1234.56, 'USD')  // "$1,234.56"
 * formatCurrency(1234.56, 'EUR')  // "1.234,56 €"
 * formatCurrency(1234, 'JPY')     // "¥1,234" (0 decimals auto)
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'ZAR'
): string {
  const locale = CURRENCY_LOCALE_MAP[currencyCode] || 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch {
    // Fallback for unknown currency codes
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

/**
 * Format a monetary amount with explicit control over decimal places.
 * Useful for intermediate calculations or display of rates.
 *
 * @param amount - The numeric amount to format
 * @param currencyCode - ISO 4217 currency code (e.g., 'ZAR', 'USD')
 * @param decimalPlaces - Number of decimal places (optional, currency default if not specified)
 * @returns Formatted currency string
 *
 * @example
 * formatCurrencyPrecise(1234.5678, 'ZAR', 4)  // "R 1 234,5678"
 * formatCurrencyPrecise(1234.5678, 'USD', 4)  // "$1,234.5678"
 */
export function formatCurrencyPrecise(
  amount: number,
  currencyCode: string = 'ZAR',
  decimalPlaces?: number
): string {
  const locale = CURRENCY_LOCALE_MAP[currencyCode] || 'en-US';

  try {
    const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currencyCode,
    };
    if (decimalPlaces !== undefined) {
      options.minimumFractionDigits = decimalPlaces;
      options.maximumFractionDigits = decimalPlaces;
    }
    return new Intl.NumberFormat(locale, options).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(decimalPlaces ?? 2)}`;
  }
}

/**
 * Parse a currency-formatted string back to a number.
 * Handles various locale-specific separators.
 *
 * @param formattedAmount - Currency-formatted string (e.g., "R 1 234,56" or "$1,234.56")
 * @param currencyCode - ISO 4217 currency code to determine locale
 * @returns Numeric amount
 *
 * @example
 * parseCurrencyAmount("R 1 234,56", 'ZAR')  // 1234.56
 * parseCurrencyAmount("$1,234.56", 'USD')   // 1234.56
 * parseCurrencyAmount("1.234,56 €", 'EUR')  // 1234.56
 */
export function parseCurrencyAmount(
  formattedAmount: string,
  currencyCode: string = 'ZAR'
): number {
  // Remove currency symbols, spaces, and locale-specific grouping
  const cleaned = formattedAmount
    .replace(/[^\d.,-]/g, '')  // Keep digits, dots, commas, minus
    .replace(/\s/g, '');       // Remove any remaining spaces

  // Determine if comma or dot is the decimal separator
  const locale = CURRENCY_LOCALE_MAP[currencyCode] || 'en-US';
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.56);
  const decimalSep = parts.find(p => p.type === 'decimal')?.value || '.';

  let normalized: string;
  if (decimalSep === ',') {
    // European style: 1.234,56 -> 1234.56
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // US style: 1,234.56 -> 1234.56
    normalized = cleaned.replace(/,/g, '');
  }

  return parseFloat(normalized) || 0;
}

/**
 * Get the currency symbol for a given currency code.
 *
 * @param currencyCode - ISO 4217 currency code
 * @returns Currency symbol (e.g., '$', 'R', '£')
 *
 * @example
 * getCurrencySymbol('ZAR')  // "R"
 * getCurrencySymbol('USD')  // "$"
 * getCurrencySymbol('GBP')  // "£"
 */
export function getCurrencySymbol(currencyCode: string = 'ZAR'): string {
  const locale = CURRENCY_LOCALE_MAP[currencyCode] || 'en-US';

  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).formatToParts(0);

    const symbolPart = parts.find(p => p.type === 'currency');
    return symbolPart?.value || currencyCode;
  } catch {
    return currencyCode;
  }
}
