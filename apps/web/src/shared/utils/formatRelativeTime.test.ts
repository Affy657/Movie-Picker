import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatRelativeTime } from './formatRelativeTime';

const NOW = new Date('2026-06-15T12:00:00Z');

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats a few minutes ago in French', () => {
    const iso = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, 'fr')).toBe('il y a 5 minutes');
  });

  it('formats a few hours ago in French', () => {
    const iso = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, 'fr')).toBe('il y a 3 heures');
  });

  it('formats a couple of days ago in French', () => {
    const iso = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, 'fr')).toBe('avant-hier');
  });

  it('formats the same in English', () => {
    const iso = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, 'en')).toBe('3 hours ago');
  });

  it('falls back to seconds for a very recent timestamp', () => {
    const iso = new Date(NOW.getTime() - 10 * 1000).toISOString();
    expect(formatRelativeTime(iso, 'fr')).toBe('il y a 10 secondes');
  });
});
