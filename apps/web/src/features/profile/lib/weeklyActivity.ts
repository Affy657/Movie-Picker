import type { DailyActivityPoint } from '@/features/profile/api/profileApi';

const DAYS_PER_WEEK = 7;

export interface WeeklyActivityPoint {
  weekStart: string;
  count: number;
}

export interface MonthMarker {
  index: number;
  label: string;
}

export function aggregateWeeklyActivity(points: DailyActivityPoint[]): WeeklyActivityPoint[] {
  const weeks: WeeklyActivityPoint[] = [];
  for (let i = 0; i < points.length; i += DAYS_PER_WEEK) {
    const chunk = points.slice(i, i + DAYS_PER_WEEK);
    const first = chunk[0];
    if (!first) continue;
    weeks.push({
      weekStart: first.date,
      count: chunk.reduce((sum, p) => sum + p.count, 0),
    });
  }
  return weeks;
}

export function weeklyIntensityLevel(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

export function monthMarkers(weeks: WeeklyActivityPoint[], locale: string): MonthMarker[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const markers: MonthMarker[] = [];
  let lastMonthKey: string | null = null;

  weeks.forEach((week, index) => {
    const date = new Date(`${week.weekStart}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return;
    const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    if (monthKey === lastMonthKey) return;
    lastMonthKey = monthKey;
    markers.push({ index, label: fmt.format(date) });
  });

  return markers;
}
