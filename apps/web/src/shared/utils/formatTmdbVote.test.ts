import { describe, it, expect } from 'vitest';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';

describe('formatTmdbVote', () => {
  it('retourne null pour null / undefined / NaN', () => {
    expect(formatTmdbVote(null)).toBeNull();
    expect(formatTmdbVote(undefined)).toBeNull();
    expect(formatTmdbVote(NaN)).toBeNull();
  });

  it('formate un entier avec une décimale', () => {
    expect(formatTmdbVote(7)).toBe('7.0/10');
  });

  it('formate un décimal à une décimale', () => {
    expect(formatTmdbVote(8.46)).toBe('8.5/10');
  });

  it('formate zéro', () => {
    expect(formatTmdbVote(0)).toBe('0.0/10');
  });
});
