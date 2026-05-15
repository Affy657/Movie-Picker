/** Préférence thème UI — aligné sur `UserProfileResponse.UiTheme` (API). */
export type UiThemePreference = 'system' | 'light' | 'dark';

/**
 * Palette d'accent — aligné sur `UserProfileResponse.AccentColor` (API).
 * `default` = palette historique bleue.
 */
export type AccentColor = 'default' | 'blue' | 'green' | 'purple' | 'pink' | 'orange';

export const ACCENT_COLORS: readonly AccentColor[] = [
  'default',
  'blue',
  'green',
  'purple',
  'pink',
  'orange',
] as const;
