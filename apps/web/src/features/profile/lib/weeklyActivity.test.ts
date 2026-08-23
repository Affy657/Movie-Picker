import { describe, it, expect } from 'vitest';
import { aggregateWeeklyActivity, monthMarkers, weeklyIntensityLevel } from './weeklyActivity';

function days(counts: number[], startDate: string): { date: string; count: number }[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  return counts.map((count, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), count };
  });
}

describe('aggregateWeeklyActivity', () => {
  it('retourne un tableau vide pour une liste vide', () => {
    expect(aggregateWeeklyActivity([])).toEqual([]);
  });

  it('regroupe les jours par paquets de 7 en sommant les comptes', () => {
    const points = days([1, 0, 2, 0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0], '2026-01-05');
    const weeks = aggregateWeeklyActivity(points);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toEqual({ weekStart: '2026-01-05', count: 4 });
    expect(weeks[1]).toEqual({ weekStart: '2026-01-12', count: 3 });
  });

  it('conserve un dernier paquet incomplet', () => {
    const points = days([1, 1, 1], '2026-01-05');
    const weeks = aggregateWeeklyActivity(points);
    expect(weeks).toEqual([{ weekStart: '2026-01-05', count: 3 }]);
  });
});

describe('weeklyIntensityLevel', () => {
  it('associe 0 à un compte nul ou négatif', () => {
    expect(weeklyIntensityLevel(0)).toBe(0);
  });

  it('associe un niveau croissant à 1, 2 puis 3+', () => {
    expect(weeklyIntensityLevel(1)).toBe(1);
    expect(weeklyIntensityLevel(2)).toBe(2);
    expect(weeklyIntensityLevel(3)).toBe(3);
    expect(weeklyIntensityLevel(10)).toBe(3);
  });
});

describe('monthMarkers', () => {
  it('place un repère au premier index et à chaque changement de mois', () => {
    const weeks = [
      { weekStart: '2026-01-26', count: 0 },
      { weekStart: '2026-02-02', count: 0 },
      { weekStart: '2026-02-09', count: 0 },
      { weekStart: '2026-03-02', count: 0 },
    ];
    const markers = monthMarkers(weeks, 'fr-FR');
    expect(markers.map((m) => m.index)).toEqual([0, 1, 3]);
  });

  it('ignore les dates invalides sans planter', () => {
    const weeks = [{ weekStart: 'pas-une-date', count: 0 }];
    expect(monthMarkers(weeks, 'fr-FR')).toEqual([]);
  });

  it('retourne un tableau vide pour une liste vide', () => {
    expect(monthMarkers([], 'fr-FR')).toEqual([]);
  });
});
