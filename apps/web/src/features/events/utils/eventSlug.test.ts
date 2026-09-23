import { describe, expect, it } from 'vitest';
import { isWellFormedEventSlug } from '@/features/events/utils/eventSlug';

describe('isWellFormedEventSlug', () => {
  it('accepts letters, digits, dashes and underscores up to 64 characters', () => {
    expect(isWellFormedEventSlug('Ab3dE_9xYz')).toBe(true);
    expect(isWellFormedEventSlug('soiree-cine_2026')).toBe(true);
    expect(isWellFormedEventSlug('-')).toBe(true);
    expect(isWellFormedEventSlug('_')).toBe(true);
    expect(isWellFormedEventSlug('a'.repeat(64))).toBe(true);
  });

  it('refuses an empty or a longer than 64 characters slug', () => {
    expect(isWellFormedEventSlug('')).toBe(false);
    expect(isWellFormedEventSlug('a'.repeat(65))).toBe(false);
  });

  it('refuses a slug carrying a path, query, fragment or encoding character', () => {
    expect(isWellFormedEventSlug('abc/def')).toBe(false);
    expect(isWellFormedEventSlug('abc%2Fdef')).toBe(false);
    expect(isWellFormedEventSlug('abc?x')).toBe(false);
    expect(isWellFormedEventSlug('abc#x')).toBe(false);
    expect(isWellFormedEventSlug('..')).toBe(false);
    expect(isWellFormedEventSlug('soirée')).toBe(false);
    expect(isWellFormedEventSlug('abc\n')).toBe(false);
  });
});
