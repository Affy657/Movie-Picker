import { describe, expect, it } from 'vitest';
import { formatReleaseDate, yearFromDate } from './formatReleaseDate';

describe('formatReleaseDate', () => {
  it('writes the release date in full', () => {
    expect(formatReleaseDate('2021-09-15', 'fr')).toBe('15 septembre 2021');
    expect(formatReleaseDate('2021-09-15', 'en')).toBe('15 September 2021');
  });

  it('garde telle quelle une date qu’elle ne sait pas lire', () => {
    expect(formatReleaseDate('2021', 'fr')).toBe('2021');
    expect(formatReleaseDate('', 'fr')).toBe('');
  });
});

describe('yearFromDate', () => {
  it('keeps the four leading digits of a date, and nothing else', () => {
    expect(yearFromDate('1972-03-14')).toBe('1972');
    expect(yearFromDate('2010')).toBe('2010');
    expect(yearFromDate('')).toBeUndefined();
    expect(yearFromDate(null)).toBeUndefined();
    expect(yearFromDate('14/03/1972')).toBeUndefined();
  });
});
