import { getPalette, isAccentColor, isUiThemePreference } from './colors';

describe('theme colors', () => {
  it('returns the light base palette by default', () => {
    const p = getPalette('light', 'default');
    expect(p.bg).toBe('#f4f6fa');
    expect(p.primary).toBe('#2563eb');
  });

  it('switches to dark base', () => {
    const p = getPalette('dark', 'default');
    expect(p.bg).toBe('#0a0f1c');
    expect(p.primary).toBe('#3b82f6');
  });

  it('applies accent overrides on top of theme', () => {
    const greenLight = getPalette('light', 'green');
    expect(greenLight.primary).toBe('#16a34a');
    const greenDark = getPalette('dark', 'green');
    expect(greenDark.primary).toBe('#22c55e');
  });

  it('isAccentColor + isUiThemePreference', () => {
    expect(isAccentColor('blue')).toBe(true);
    expect(isAccentColor('mauve')).toBe(false);
    expect(isAccentColor(42)).toBe(false);

    expect(isUiThemePreference('system')).toBe(true);
    expect(isUiThemePreference('light')).toBe(true);
    expect(isUiThemePreference('auto')).toBe(false);
  });
});
