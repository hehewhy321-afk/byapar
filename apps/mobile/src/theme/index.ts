export type ThemeMode = 'dark' | 'light';

export const darkColors = {
  // Pure clean black for dark mode
  bg: '#000000',
  surface: '#0A0A0A',
  card: '#121212',
  cardElevated: '#1A1A1A',
  cardPressed: '#222222',

  // Clean subtle borders
  border: '#242424',
  borderLight: '#2E2E2E',
  borderGlass: '#202020',
  borderGlassActive: '#333333',

  // Crisp typography
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textMuted: '#737373',

  // Reddit Orange Primary Accent
  primary: '#FF4500',
  primaryText: '#FFFFFF',
  primaryHover: '#E03D00',
  primaryBg: 'rgba(255, 69, 0, 0.14)',
  primaryGlow: 'rgba(255, 69, 0, 0.35)',

  // Orange aliases
  orange: '#FF4500',
  orangeDark: '#E03D00',
  orangeBg: 'rgba(255, 69, 0, 0.14)',
  orangeGlow: 'rgba(255, 69, 0, 0.35)',

  // Aliased to Reddit Orange
  emerald: '#FF4500',
  emeraldDark: '#E03D00',
  emeraldBg: 'rgba(255, 69, 0, 0.14)',
  emeraldGlow: 'rgba(255, 69, 0, 0.35)',

  indigo: '#FF4500',
  indigoLight: '#FF6432',
  indigoBg: 'rgba(255, 69, 0, 0.14)',
  indigoGlow: 'rgba(255, 69, 0, 0.25)',

  cyan: '#FF4500',
  cyanBg: 'rgba(255, 69, 0, 0.14)',

  danger: '#EF4444',
  red: '#EF4444',
  redBg: 'rgba(239, 68, 68, 0.15)',

  amber: '#F59E0B',
  amberBg: 'rgba(245, 158, 11, 0.15)',

  blue: '#3B82F6',
  blueBg: 'rgba(59, 130, 246, 0.15)',

  whatsapp: '#25D366',
  whatsappBg: 'rgba(37, 211, 102, 0.15)',
};

export const lightColors = {
  // Crisp canvas for light mode
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardElevated: '#F8F9FA',
  cardPressed: '#EDF0F3',

  // Clean subtle borders
  border: '#E2E8F0',
  borderLight: '#CBD5E1',
  borderGlass: '#E2E8F0',
  borderGlassActive: '#94A3B8',

  // Ultra-high contrast crisp typography
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',

  // Reddit Orange Primary Accent
  primary: '#FF4500',
  primaryText: '#FFFFFF',
  primaryHover: '#E03D00',
  primaryBg: 'rgba(255, 69, 0, 0.10)',
  primaryGlow: 'rgba(255, 69, 0, 0.25)',

  // Orange aliases
  orange: '#FF4500',
  orangeDark: '#E03D00',
  orangeBg: 'rgba(255, 69, 0, 0.10)',
  orangeGlow: 'rgba(255, 69, 0, 0.25)',

  // Aliased to Reddit Orange
  emerald: '#FF4500',
  emeraldDark: '#E03D00',
  emeraldBg: 'rgba(255, 69, 0, 0.10)',
  emeraldGlow: 'rgba(255, 69, 0, 0.25)',

  indigo: '#FF4500',
  indigoLight: '#E03D00',
  indigoBg: 'rgba(255, 69, 0, 0.10)',
  indigoGlow: 'rgba(255, 69, 0, 0.25)',

  cyan: '#FF4500',
  cyanBg: 'rgba(255, 69, 0, 0.10)',

  danger: '#DC2626',
  red: '#DC2626',
  redBg: 'rgba(220, 38, 38, 0.10)',

  amber: '#D97706',
  amberBg: 'rgba(217, 119, 6, 0.10)',

  blue: '#2563EB',
  blueBg: 'rgba(37, 99, 235, 0.10)',

  whatsapp: '#16A34A',
  whatsappBg: 'rgba(22, 163, 74, 0.10)',
};

const typography = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  display: 30,
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};

export const getTheme = (mode: ThemeMode = 'dark') => {
  const isDark = mode === 'dark';
  return {
    mode,
    colors: isDark ? darkColors : lightColors,
    typography,
    spacing,
    borderRadius,
    shadows: {
      subtle: {
        shadowColor: isDark ? '#000' : '#64748B',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.3 : 0.08,
        shadowRadius: 3,
        elevation: 2,
      },
      medium: {
        shadowColor: isDark ? '#000' : '#64748B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: isDark ? 0.45 : 0.1,
        shadowRadius: 6,
        elevation: 4,
      },
      glowGreen: {
        shadowColor: '#FF4500',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
      },
      glowIndigo: {
        shadowColor: '#FF4500',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
      },
    },
  };
};

// Default export is dark mode with Reddit Orange
export const theme = getTheme('dark');
export type Theme = ReturnType<typeof getTheme>;
