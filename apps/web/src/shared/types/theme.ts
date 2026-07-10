export type UiThemePreference = 'system' | 'light' | 'dark';

export type RatingScale = 'five' | 'ten';

export const RATING_SCALES: readonly RatingScale[] = ['five', 'ten'];

export type AccentColor =
  'default' | 'blue' | 'green' | 'purple' | 'pink' | 'orange' | 'red' | 'cyan' | 'indigo';

export const ACCENT_COLORS: readonly AccentColor[] = [
  'default',
  'blue',
  'green',
  'purple',
  'pink',
  'orange',
  'red',
  'cyan',
  'indigo',
] as const;
