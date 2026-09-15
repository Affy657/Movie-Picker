import { describe, it, expect } from 'vitest';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';

describe('formatTmdbVote', () => {
  it('retourne null pour null / undefined / NaN', () => {
    expect(formatTmdbVote(null)).toBeNull();
    expect(formatTmdbVote(undefined)).toBeNull();
    expect(formatTmdbVote(NaN)).toBeNull();
  });

  it('converts the TMDB rating (out of 10) to a 5 scale with one decimal (integer)', () => {
    expect(formatTmdbVote(7)).toBe('3.5/5');
  });

  it('converts a decimal to a 5 scale with one decimal', () => {
    expect(formatTmdbVote(8.46)).toBe('4.2/5');
  });

  it('returns null for a null rating (unrated movie)', () => {
    expect(formatTmdbVote(0)).toBeNull();
    expect(formatTmdbVote(0, 'ten')).toBeNull();
  });

  it('formats a low but real rating', () => {
    expect(formatTmdbVote(0.4)).toBe('0.2/5');
  });

  it('plafond TMDB (10) → 5/5', () => {
    expect(formatTmdbVote(10)).toBe('5.0/5');
  });

  it("scale 'ten' : renvoie la note TMDB brute sur 10", () => {
    expect(formatTmdbVote(7, 'ten')).toBe('7.0/10');
    expect(formatTmdbVote(8.46, 'ten')).toBe('8.5/10');
  });

  it("scale 'ten' avec null/NaN : renvoie null", () => {
    expect(formatTmdbVote(null, 'ten')).toBeNull();
    expect(formatTmdbVote(NaN, 'ten')).toBeNull();
  });
});
