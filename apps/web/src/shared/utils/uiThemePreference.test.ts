import { describe, it, expect } from 'vitest';
import { getNextUiPreference, isUiThemePreference } from '@/shared/utils/uiThemePreference';

describe('uiThemePreference', () => {
  it('cycles light, dark, system, light', () => {
    expect(getNextUiPreference('light')).toBe('dark');
    expect(getNextUiPreference('dark')).toBe('system');
    expect(getNextUiPreference('system')).toBe('light');
  });

  it('isUiThemePreference', () => {
    expect(isUiThemePreference('light')).toBe(true);
    expect(isUiThemePreference('invalid')).toBe(false);
  });
});
