/**
 * RostraCore Design System - Tokens
 *
 * Expert-validated design tokens for South African security industry
 * Mobile-first, high-contrast, culturally appropriate
 */

export const tokens = {
  /**
   * COLORS
   * Based on security industry psychology:
   * - Navy: Authority, Trust, Professionalism
   * - Orange: Action, Urgency, Safety
   * - Green: Stability, Growth, Success
   */
  colors: {
    // Primary Brand (Deep Navy - Authority)
    primary: {
      50: '#E6F0FF',
      100: '#CCE0FF',
      200: '#99C2FF',
      300: '#66A3FF',
      400: '#3385FF',
      500: '#0A2540',  // Main brand color
      600: '#081D33',
      700: '#061626',
      800: '#040E1A',
      900: '#02070D',
    },

    // Accent (Safety Orange - Action)
    accent: {
      50: '#FFF4F0',
      100: '#FFE9E0',
      200: '#FFD3C2',
      300: '#FFBDA3',
      400: '#FFA785',
      500: '#FF6B35',  // Main accent color
      600: '#E55A28',
      700: '#CC491C',
      800: '#B23810',
      900: '#992704',
    },

    // Success (Forest Green - Confirmation)
    success: {
      50: '#E8F5F1',
      100: '#D1EBE3',
      200: '#A3D7C7',
      300: '#75C3AB',
      400: '#47AF8F',
      500: '#2D6A4F',  // Main success color
      600: '#245540',
      700: '#1B4030',
      800: '#122B20',
      900: '#091510',
    },

    // Warning (Amber - Attention)
    warning: {
      50: '#FFF8ED',
      100: '#FFF1DB',
      200: '#FFE3B7',
      300: '#FFD593',
      400: '#FFC76F',
      500: '#F77F00',
      600: '#DE6600',
      700: '#C54D00',
      800: '#AC3400',
      900: '#931B00',
    },

    // Danger (Red - Error/Critical)
    danger: {
      50: '#FFEBEE',
      100: '#FFD7DC',
      200: '#FFAFB9',
      300: '#FF8796',
      400: '#FF5F73',
      500: '#C1121F',
      600: '#A00E19',
      700: '#7F0B13',
      800: '#5E080D',
      900: '#3D0507',
    },

    // Neutrals (High contrast for SA sunlight/cheap screens)
    gray: {
      50: '#F8F9FA',
      100: '#E9ECEF',
      200: '#DEE2E6',
      300: '#CED4DA',
      400: '#ADB5BD',
      500: '#6C757D',
      600: '#495057',
      700: '#343A40',
      800: '#212529',
      900: '#000000',
    },

    // Semantic colors
    background: {
      primary: '#FFFFFF',
      secondary: '#F8F9FA',
      tertiary: '#E9ECEF',
      dark: '#0A2540',
    },

    text: {
      primary: '#212529',
      secondary: '#6C757D',
      tertiary: '#ADB5BD',
      inverse: '#FFFFFF',
    },

    border: {
      light: '#E9ECEF',
      medium: '#CED4DA',
      dark: '#ADB5BD',
    },
  },

  /**
   * TYPOGRAPHY
   * Optimized for:
   * - Cheap Android phones (common in SA)
   * - Aging eyes (many security company owners 50+)
   * - Outdoor viewing (high sunlight)
   */
  typography: {
    fontFamily: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", Consolas, Monaco, "Courier New", monospace',
    },

    fontSize: {
      xs: '0.75rem',    // 12px - Fine print, labels
      sm: '0.875rem',   // 14px - Secondary text
      base: '1rem',     // 16px - Body text (WCAG minimum)
      lg: '1.125rem',   // 18px - Subheadings
      xl: '1.25rem',    // 20px - Card titles
      '2xl': '1.5rem',  // 24px - Section headings
      '3xl': '2rem',    // 32px - Page headings (mobile)
      '4xl': '2.5rem',  // 40px - Hero text (mobile)
      '5xl': '3rem',    // 48px - Hero text (desktop)
      '6xl': '4rem',    // 64px - Large display
    },

    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },

    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.6,     // Optimal for body text readability
      relaxed: 1.75,
      loose: 2,
    },

    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  /**
   * SPACING
   * 4px base unit (divisible by 2 and 4, mobile-friendly)
   */
  spacing: {
    0: '0',
    px: '1px',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    2: '0.5rem',      // 8px
    3: '0.75rem',     // 12px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    10: '2.5rem',     // 40px
    12: '3rem',       // 48px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
    32: '8rem',       // 128px
  },

  /**
   * BORDER RADIUS
   * Moderate rounding (professional, not playful)
   */
  borderRadius: {
    none: '0',
    sm: '0.25rem',    // 4px - Buttons, inputs
    md: '0.5rem',     // 8px - Cards
    lg: '1rem',       // 16px - Modals, sections
    xl: '1.5rem',     // 24px - Large cards
    '2xl': '2rem',    // 32px - Hero sections
    full: '9999px',   // Pills, avatars
  },

  /**
   * SHADOWS
   * Subtle elevation (professional, not flashy)
   */
  shadows: {
    none: 'none',
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  },

  /**
   * BREAKPOINTS
   * Mobile-first approach
   */
  breakpoints: {
    xs: '320px',   // Small phones
    sm: '640px',   // Large phones
    md: '768px',   // Tablets
    lg: '1024px',  // Small laptops
    xl: '1280px',  // Desktops
    '2xl': '1536px', // Large screens
  },

  /**
   * Z-INDEX
   * Layering system
   */
  zIndex: {
    0: 0,
    10: 10,
    20: 20,
    30: 30,
    40: 40,
    50: 50,
    modal: 1000,
    popover: 1010,
    overlay: 1020,
    dropdown: 1030,
    toast: 1040,
    tooltip: 1050,
  },

  /**
   * TRANSITIONS
   * Smooth, professional animations
   */
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
    slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  /**
   * TAP TARGETS
   * Minimum sizes for mobile interaction (South African hands + screen protectors)
   */
  tapTargets: {
    minimum: '44px',      // Apple guideline
    recommended: '48px',  // Our standard (better for SA)
    comfortable: '56px',  // Primary actions
  },
};

/**
 * SOUTH AFRICAN SPECIFIC CONSTANTS
 */
export const saConstants = {
  languages: ['en', 'af'],  // English, Afrikaans
  currency: 'ZAR',
  timezone: 'Africa/Johannesburg',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',

  // Trust signals
  certifications: [
    { name: 'PSIRA', logo: '/images/psira-logo.svg' },
    { name: 'SAIDSA', logo: '/images/saidsa-logo.svg' },
  ],

  // Data consciousness (average SA mobile data cost)
  dataAware: {
    imageOptimization: 'aggressive',
    videoAutoplay: false,
    prefetch: 'minimal',
    maxPageWeight: '500KB',
  },
};

export default tokens;
