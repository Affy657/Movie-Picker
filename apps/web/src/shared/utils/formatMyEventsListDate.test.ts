import { describe, it, expect } from 'vitest';
import { formatMyEventsListDate } from './formatMyEventsListDate';

describe('formatMyEventsListDate', () => {
  it('formats in French', () => {
    expect(formatMyEventsListDate('2026-04-30', 'fr')).toMatch(/30/);
    expect(formatMyEventsListDate('2026-04-30', 'fr')).toMatch(/2026/);
  });

  it('returns raw string on invalid input', () => {
    expect(formatMyEventsListDate('nope', 'fr')).toBe('nope');
  });
});
