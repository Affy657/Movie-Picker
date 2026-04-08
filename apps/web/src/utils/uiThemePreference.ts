import type { UiThemePreference } from '../types/auth';

export function getNextUiPreference(current: UiThemePreference): UiThemePreference {
  if (current === 'light') return 'dark';
  if (current === 'dark') return 'system';
  return 'light';
}

export function isUiThemePreference(v: unknown): v is UiThemePreference {
  return v === 'system' || v === 'light' || v === 'dark';
}
