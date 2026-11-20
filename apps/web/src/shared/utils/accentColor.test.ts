import { describe, expect, it } from 'vitest';
import { ACCENT_COLORS } from '@/shared/types/theme';
import { accentZoneClass, isAccentColor, isChosenAccent } from '@/shared/utils/accentColor';

describe('accentColor', () => {
  it('recognises the served accent colours only', () => {
    expect(isAccentColor('pink')).toBe(true);
    expect(isAccentColor('fuchsia')).toBe(false);
    expect(isAccentColor(null)).toBe(false);
  });

  it('gives every accent its own zone class', () => {
    const classes = ACCENT_COLORS.map(accentZoneClass);

    expect(accentZoneClass('pink')).toBe('accent-pink');
    expect(accentZoneClass('default')).toBe('accent-default');
    expect(new Set(classes).size).toBe(ACCENT_COLORS.length);
  });

  it('treats only a colour the member picked as chosen', () => {
    expect(isChosenAccent('pink')).toBe(true);
    expect(isChosenAccent('default')).toBe(false);
    expect(isChosenAccent(null)).toBe(false);
    expect(isChosenAccent(undefined)).toBe(false);
  });
});
