import type { DailyActivityPoint } from '@/features/events/api/userStatsApi';

export const STREAK_MIN_WEEKS = 2;

const DAYS_IN_WEEK = 7;

export interface MonthActivity {
  year: number;
  month: number;
  count: number;
  startsMidMonth: boolean;
  inProgress: boolean;
}

export interface Streak {
  weeks: number;
  bestWeeks: number;
}

function utcDate(iso: string): Date | null {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function monthlyActivity(points: readonly DailyActivityPoint[]): MonthActivity[] {
  const months: MonthActivity[] = [];
  let lastDay = 0;
  for (const point of points) {
    const date = utcDate(point.date);
    if (!date) continue;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const current = months.at(-1);
    if (current?.year === year && current.month === month) {
      current.count += point.count;
    } else {
      months.push({
        year,
        month,
        count: point.count,
        startsMidMonth: months.length === 0 && date.getUTCDate() > 1,
        inProgress: false,
      });
    }
    lastDay = date.getUTCDate();
  }
  const last = months.at(-1);
  if (last) last.inProgress = lastDay < lastDayOfMonth(last.year, last.month);
  return months;
}

export function weekdayActivity(points: readonly DailyActivityPoint[]): number[] {
  const counts = Array.from({ length: DAYS_IN_WEEK }, () => 0);
  for (const point of points) {
    const date = utcDate(point.date);
    if (!date) continue;
    const mondayFirst = (date.getUTCDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK;
    counts[mondayFirst] = (counts[mondayFirst] ?? 0) + point.count;
  }
  return counts;
}

export function shownStreak(weeks: number, bestWeeks: number): Streak | null {
  return weeks >= STREAK_MIN_WEEKS ? { weeks, bestWeeks } : null;
}
