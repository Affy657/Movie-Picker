export type UiThemePreference = 'system' | 'light' | 'dark';

export type AccentColor = 'default' | 'blue' | 'green' | 'purple' | 'pink' | 'orange';

export const ACCENT_COLORS: readonly AccentColor[] = [
  'default',
  'blue',
  'green',
  'purple',
  'pink',
  'orange',
] as const;
