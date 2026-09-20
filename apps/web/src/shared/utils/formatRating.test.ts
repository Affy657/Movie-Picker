import { describe, expect, it } from 'vitest';
import { averageRating, formatRating } from '@/shared/utils/formatRating';

describe('formatRating', () => {
  it('reads a 7/10 rating as 3,5/5 on the five scale, in French', () => {
    expect(formatRating(7, 'five', 'fr')).toBe('3,5/5');
  });

  it('reads the same rating as 3.5/5 in English', () => {
    expect(formatRating(7, 'five', 'en')).toBe('3.5/5');
  });

  it('drops the decimal when the rating is a whole number of stars', () => {
    expect(formatRating(8, 'five', 'fr')).toBe('4/5');
    expect(formatRating(10, 'five', 'en')).toBe('5/5');
  });

  it('keeps integers on the ten scale', () => {
    expect(formatRating(7, 'ten', 'fr')).toBe('7/10');
    expect(formatRating(1, 'ten', 'en')).toBe('1/10');
  });

  it('formats an average with one decimal on both scales', () => {
    expect(formatRating(8, 'five', 'fr', { decimals: 1 })).toBe('4,0/5');
    expect(formatRating(7.5, 'ten', 'en', { decimals: 1 })).toBe('7.5/10');
    expect(formatRating(7.666, 'five', 'fr', { decimals: 1 })).toBe('3,8/5');
  });
});

describe('averageRating', () => {
  it('returns null when nobody rated', () => {
    expect(averageRating([])).toBeNull();
  });

  it('averages the raw values out of 10', () => {
    expect(averageRating([7, 8, 9])).toBe(8);
    expect(averageRating([7, 8])).toBe(7.5);
  });
});
