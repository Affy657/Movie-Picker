export type AccentColor = 'default' | 'blue' | 'green' | 'purple' | 'pink' | 'orange';
export type UiThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const ACCENT_COLORS: readonly AccentColor[] = [
  'default',
  'blue',
  'green',
  'purple',
  'pink',
  'orange',
] as const;

type Palette = {
  bg: string;
  surface: string;
  navBg: string;
  text: string;
  textMuted: string;
  meta: string;
  border: string;
  borderSubtle: string;
  sectionHeading: string;
  placeholder: string;
  error: string;
  errorHover: string;
  success: string;
  primary: string;
  primaryHover: string;
  primaryContrast: string;
  accentWarm: string;
  badgeFinishedBg: string;
  badgeFinishedText: string;
  badgeUpcomingBg: string;
  badgeUpcomingText: string;
  badgeLiveBg: string;
  badgeLiveText: string;
  badgeHostBg: string;
  badgeHostText: string;
  badgeMeBg: string;
  badgeMeText: string;
  wheelBg: string;
  wheelLabel: string;
  posterPlaceholder: string;
  inputBg: string;
  inputReadonly: string;
};

const lightBase: Palette = {
  bg: '#f4f6fa',
  surface: '#ffffff',
  navBg: '#ffffffee',
  text: '#0f172a',
  textMuted: '#475569',
  meta: '#64748b',
  border: '#cbd5e1',
  borderSubtle: '#e2e8f0',
  sectionHeading: '#1e293b',
  placeholder: '#94a3b8',
  error: '#b91c1c',
  errorHover: '#7f1d1d',
  success: '#15803d',
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryContrast: '#ffffff',
  accentWarm: '#06b6d4',
  badgeFinishedBg: '#e2e8f0',
  badgeFinishedText: '#475569',
  badgeUpcomingBg: '#fef3c7',
  badgeUpcomingText: '#92400e',
  badgeLiveBg: '#d1fae5',
  badgeLiveText: '#065f46',
  badgeHostBg: '#e0e7ff',
  badgeHostText: '#3730a3',
  badgeMeBg: '#dbeafe',
  badgeMeText: '#1e40af',
  wheelBg: '#e0e7ff',
  wheelLabel: '#3730a3',
  posterPlaceholder: '#e2e8f0',
  inputBg: '#ffffff',
  inputReadonly: '#f1f5f9',
};

const darkBase: Palette = {
  bg: '#0a0f1c',
  surface: '#131a2b',
  navBg: '#0a0f1cee',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  meta: '#64748b',
  border: '#334155',
  borderSubtle: '#1a2236',
  sectionHeading: '#cbd5e1',
  placeholder: '#475569',
  error: '#f87171',
  errorHover: '#fca5a5',
  success: '#4ade80',
  primary: '#3b82f6',
  primaryHover: '#60a5fa',
  primaryContrast: '#0a0f1c',
  accentWarm: '#22d3ee',
  badgeFinishedBg: '#1e293b',
  badgeFinishedText: '#cbd5e1',
  badgeUpcomingBg: '#2a1e08',
  badgeUpcomingText: '#fbbf24',
  badgeLiveBg: '#0e2818',
  badgeLiveText: '#4ade80',
  badgeHostBg: '#1e1b4b',
  badgeHostText: '#c7d2fe',
  badgeMeBg: '#172554',
  badgeMeText: '#93c5fd',
  wheelBg: '#1e1b4b',
  wheelLabel: '#c7d2fe',
  posterPlaceholder: '#1e293b',
  inputBg: '#0f1524',
  inputReadonly: '#0a0f1c',
};

type AccentOverride = { primary: string; primaryHover: string; primaryContrast: string };

const lightAccents: Record<Exclude<AccentColor, 'default'>, AccentOverride> = {
  blue: { primary: '#2563eb', primaryHover: '#1d4ed8', primaryContrast: '#ffffff' },
  green: { primary: '#16a34a', primaryHover: '#15803d', primaryContrast: '#ffffff' },
  purple: { primary: '#7c3aed', primaryHover: '#6d28d9', primaryContrast: '#ffffff' },
  pink: { primary: '#db2777', primaryHover: '#be185d', primaryContrast: '#ffffff' },
  orange: { primary: '#ea580c', primaryHover: '#c2410c', primaryContrast: '#ffffff' },
};

const darkAccents: Record<Exclude<AccentColor, 'default'>, AccentOverride> = {
  blue: { primary: '#3b82f6', primaryHover: '#60a5fa', primaryContrast: '#0a0f1c' },
  green: { primary: '#22c55e', primaryHover: '#4ade80', primaryContrast: '#052e16' },
  purple: { primary: '#a78bfa', primaryHover: '#c4b5fd', primaryContrast: '#1e1b4b' },
  pink: { primary: '#f472b6', primaryHover: '#f9a8d4', primaryContrast: '#500724' },
  orange: { primary: '#fb923c', primaryHover: '#fdba74', primaryContrast: '#431407' },
};

export function getPalette(theme: ResolvedTheme, accent: AccentColor): Palette {
  const base = theme === 'dark' ? darkBase : lightBase;
  if (accent === 'default') return base;
  const overrides = theme === 'dark' ? darkAccents[accent] : lightAccents[accent];
  return { ...base, ...overrides, accentWarm: base.accentWarm };
}

export function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === 'string' && (ACCENT_COLORS as readonly string[]).includes(value);
}

export function isUiThemePreference(value: unknown): value is UiThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}
