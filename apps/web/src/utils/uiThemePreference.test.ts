import { describe, it, expect } from 'vitest';
import { getNextUiPreference, isUiThemePreference } from './uiThemePreference';

describe('uiThemePreference', () => {
  it('cycle clair → sombre → système → clair', () => {
    expect(getNextUiPreference('light')).toBe('dark');
    expect(getNextUiPreference('dark')).toBe('system');
    expect(getNextUiPreference('system')).toBe('light');
  });

  it('isUiThemePreference', () => {
    expect(isUiThemePreference('light')).toBe(true);
    expect(isUiThemePreference('invalid')).toBe(false);
  });
});
