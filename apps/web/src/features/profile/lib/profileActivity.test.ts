import { describe, it, expect } from 'vitest';
import { STREAK_MIN_WEEKS, monthlyActivity, shownStreak, weekdayActivity } from './profileActivity';

function days(counts: number[], startDate: string): { date: string; count: number }[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  return counts.map((count, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), count };
  });
}

describe('monthlyActivity', () => {
  it('returns no month for no point', () => {
    expect(monthlyActivity([])).toEqual([]);
  });

  it('adds up the movie nights of each calendar month, in order', () => {
    const points = [
      { date: '2026-06-01', count: 1 },
      { date: '2026-06-30', count: 2 },
      { date: '2026-07-01', count: 0 },
      { date: '2026-07-31', count: 4 },
    ];
    expect(monthlyActivity(points).map(({ year, month, count }) => [year, month, count])).toEqual([
      [2026, 5, 3],
      [2026, 6, 4],
    ]);
  });

  it('flags a first month that starts after its first day', () => {
    const months = monthlyActivity(days(Array(10).fill(0), '2026-05-25'));
    expect(months.map((m) => m.startsMidMonth)).toEqual([true, false]);
  });

  it('flags a last month that ends before its last day as still in progress', () => {
    const months = monthlyActivity(days(Array(61).fill(0), '2026-10-01'));
    expect(months.map((m) => m.inProgress)).toEqual([false, false]);
    const cut = monthlyActivity(days(Array(52).fill(0), '2026-10-01'));
    expect(cut.map((m) => m.inProgress)).toEqual([false, true]);
  });

  it('keeps a month without any movie night, at zero', () => {
    const points = [
      { date: '2026-06-01', count: 2 },
      { date: '2026-07-01', count: 0 },
      { date: '2026-08-01', count: 1 },
    ];
    expect(monthlyActivity(points).map((m) => m.count)).toEqual([2, 0, 1]);
  });
});

describe('weekdayActivity', () => {
  it('counts the movie nights of each weekday, from Monday to Sunday', () => {
    const points = [
      { date: '2026-11-16', count: 1 },
      { date: '2026-11-17', count: 2 },
      { date: '2026-11-19', count: 1 },
      { date: '2026-11-22', count: 3 },
      { date: '2026-11-24', count: 1 },
    ];
    expect(weekdayActivity(points)).toEqual([1, 3, 0, 1, 0, 0, 3]);
  });

  it('returns seven zeros without any movie night', () => {
    expect(weekdayActivity([])).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('shownStreak', () => {
  it('shows a streak from two weeks in a row, with its record', () => {
    expect(STREAK_MIN_WEEKS).toBe(2);
    expect(shownStreak(2, 5)).toEqual({ weeks: 2, bestWeeks: 5 });
  });

  it('hides a streak of a single week or a broken one, whatever the record', () => {
    expect(shownStreak(1, 1)).toBeNull();
    expect(shownStreak(0, 9)).toBeNull();
  });
});
