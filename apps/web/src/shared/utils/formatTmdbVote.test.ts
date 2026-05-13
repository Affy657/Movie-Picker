import { describe, it, expect } from 'vitest';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';

describe('formatTmdbVote', () => {
  it('retourne null pour null / undefined / NaN', () => {
    expect(formatTmdbVote(null)).toBeNull();
    expect(formatTmdbVote(undefined)).toBeNull();
    expect(formatTmdbVote(NaN)).toBeNull();
  });

  it('convertit la note TMDB (sur 10) sur 5 avec une décimale (entier)', () => {
    expect(formatTmdbVote(7)).toBe('3.5/5');
  });

  it('convertit un décimal sur 5 avec une décimale', () => {
    expect(formatTmdbVote(8.46)).toBe('4.2/5');
  });

  it('formate zéro', () => {
    expect(formatTmdbVote(0)).toBe('0.0/5');
  });

  it('plafond TMDB (10) → 5/5', () => {
    expect(formatTmdbVote(10)).toBe('5.0/5');
  });
});
