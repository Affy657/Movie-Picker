import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  daysUntilEventDate,
  formatRelativeEventDate,
  relativeEventDistance,
} from './formatRelativeEventDate';

describe('formatRelativeEventDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dit aujourd'hui pour la date du jour", () => {
    expect(formatRelativeEventDate('2026-06-15', 'fr')).toBe('aujourd’hui');
  });

  it('dit demain pour le lendemain', () => {
    expect(formatRelativeEventDate('2026-06-16', 'fr')).toBe('demain');
  });

  it('dit hier pour la veille', () => {
    expect(formatRelativeEventDate('2026-06-14', 'fr')).toBe('hier');
  });

  it('counts in days under a month', () => {
    expect(formatRelativeEventDate('2026-06-19', 'fr')).toBe('dans 4 jours');
  });

  it('counts in days in the recent past', () => {
    expect(formatRelativeEventDate('2026-06-10', 'fr')).toBe('il y a 5 jours');
  });

  it('switches to months beyond 31 days', () => {
    expect(formatRelativeEventDate('2027-02-20', 'fr')).toBe('dans 8 mois');
  });

  it('switches to years from twelve months', () => {
    expect(formatRelativeEventDate('2027-07-20', 'fr')).toBe('l’année prochaine');
    expect(formatRelativeEventDate('2035-03-01', 'fr')).toBe('dans 9 ans');
    expect(formatRelativeEventDate('2024-01-10', 'fr')).toBe('il y a 2 ans');
  });

  it('formate en anglais', () => {
    expect(formatRelativeEventDate('2026-06-19', 'en')).toBe('in 4 days');
  });

  it('returns the raw string when the date is invalid', () => {
    expect(formatRelativeEventDate('not-a-date', 'fr')).toBe('not-a-date');
  });

  it('measures the distance in days, then months, then years', () => {
    expect(relativeEventDistance('2026-06-19')).toEqual({ unit: 'day', value: 4 });
    expect(relativeEventDistance('2026-06-10')).toEqual({ unit: 'day', value: -5 });
    expect(relativeEventDistance('2027-02-20')).toEqual({ unit: 'month', value: 8 });
    expect(relativeEventDistance('2035-03-01')).toEqual({ unit: 'year', value: 9 });
    expect(relativeEventDistance('nope')).toBeNull();
  });

  it('counts the days until a date, negative once it is past', () => {
    expect(daysUntilEventDate('2026-06-15')).toBe(0);
    expect(daysUntilEventDate('2026-06-22')).toBe(7);
    expect(daysUntilEventDate('2026-06-10')).toBe(-5);
    expect(daysUntilEventDate('2026-06')).toBeNull();
    expect(daysUntilEventDate('soon')).toBeNull();
  });
});
