import { describe, it, expect } from 'vitest';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';

describe('formatTmdbVote', () => {
  it('retourne null pour null / undefined / NaN', () => {
    expect(formatTmdbVote(null, 'five', 'en')).toBeNull();
    expect(formatTmdbVote(undefined, 'five', 'en')).toBeNull();
    expect(formatTmdbVote(NaN, 'five', 'en')).toBeNull();
  });

  it('converts the TMDB rating (out of 10) to a 5 scale with one decimal (integer)', () => {
    expect(formatTmdbVote(7, 'five', 'en')).toBe('3.5/5');
  });

  it('converts a decimal to a 5 scale with one decimal', () => {
    expect(formatTmdbVote(8.46, 'five', 'en')).toBe('4.2/5');
  });

  it('writes the decimal the way the reader does', () => {
    expect(formatTmdbVote(8.5, 'ten', 'fr')).toBe('8,5/10');
    expect(formatTmdbVote(8.5, 'ten', 'en')).toBe('8.5/10');
    expect(formatTmdbVote(7, 'five', 'fr')).toBe('3,5/5');
  });

  it('returns null for a null rating (unrated movie)', () => {
    expect(formatTmdbVote(0, 'five', 'en')).toBeNull();
    expect(formatTmdbVote(0, 'ten', 'en')).toBeNull();
  });

  it('formats a low but real rating', () => {
    expect(formatTmdbVote(0.4, 'five', 'en')).toBe('0.2/5');
  });

  it('plafond TMDB (10) → 5/5', () => {
    expect(formatTmdbVote(10, 'five', 'en')).toBe('5.0/5');
  });

  it("scale 'ten' : renvoie la note TMDB brute sur 10", () => {
    expect(formatTmdbVote(7, 'ten', 'en')).toBe('7.0/10');
    expect(formatTmdbVote(8.46, 'ten', 'en')).toBe('8.5/10');
  });

  it("scale 'ten' avec null/NaN : renvoie null", () => {
    expect(formatTmdbVote(null, 'ten', 'en')).toBeNull();
    expect(formatTmdbVote(NaN, 'ten', 'en')).toBeNull();
  });
});
