import { describe, expect, it } from 'vitest';
import { formatReleaseDate } from './formatReleaseDate';

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
