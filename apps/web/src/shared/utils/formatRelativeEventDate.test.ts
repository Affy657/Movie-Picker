import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatRelativeEventDate } from './formatRelativeEventDate';

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

  it('compte en jours en deçà d’un mois', () => {
    expect(formatRelativeEventDate('2026-06-19', 'fr')).toBe('dans 4 jours');
  });

  it('compte en jours dans le passé récent', () => {
    expect(formatRelativeEventDate('2026-06-10', 'fr')).toBe('il y a 5 jours');
  });

  it('bascule en mois au-delà de 31 jours', () => {
    expect(formatRelativeEventDate('2027-07-20', 'fr')).toBe('dans 13 mois');
  });

  it('formate en anglais', () => {
    expect(formatRelativeEventDate('2026-06-19', 'en')).toBe('in 4 days');
  });

  it('retourne la chaîne brute si la date est invalide', () => {
    expect(formatRelativeEventDate('not-a-date', 'fr')).toBe('not-a-date');
  });
});
