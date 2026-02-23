// Video dimensions and frame rate
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const FPS = 30;

// Brand colors (matching RostraCore frontend)
export const BRAND = {
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueLight: '#DBEAFE',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
  green: '#059669',
  red: '#DC2626',
  amber: '#D97706',
};

// Typography
export const FONT_FAMILY = 'Inter, system-ui, -apple-system, sans-serif';

// Timing helpers (in frames at 30fps)
export const seconds = (s: number) => Math.round(s * FPS);
export const ms = (milliseconds: number) => Math.round((milliseconds / 1000) * FPS);
