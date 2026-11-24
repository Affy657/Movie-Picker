export type DateTimeValue = { date: string; time: string };

export type MonthView = { year: number; month: number };

export type CalendarDay = { iso: string; day: number };

const DAYS_PER_WEEK = 7;
const TIME_STEP_MINUTES = 30;
const MINUTES_PER_DAY = 24 * 60;
const FIRST_MONDAY = Date.UTC(2024, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function isoDay(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function monthOf(iso: string): MonthView {
  const [year = 1970, month = 1] = iso.split('-').map(Number);
  return { year, month };
}

export function shiftMonth(view: MonthView, delta: number): MonthView {
  const index = view.year * 12 + (view.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function compareMonths(left: MonthView, right: MonthView): number {
  return left.year * 12 + left.month - (right.year * 12 + right.month);
}

export function shiftDay(iso: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = iso.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return isoDay(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

export function monthWeeks(view: MonthView): Array<Array<CalendarDay | null>> {
  const first = new Date(Date.UTC(view.year, view.month - 1, 1));
  const leading = (first.getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
  const length = new Date(Date.UTC(view.year, view.month, 0)).getUTCDate();
  const cells: Array<CalendarDay | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length }, (_, index) => ({
      iso: isoDay(view.year, view.month, index + 1),
      day: index + 1,
    })),
  ];
  const weeks: Array<Array<CalendarDay | null>> = [];
  for (let start = 0; start < cells.length; start += DAYS_PER_WEEK) {
    const week = cells.slice(start, start + DAYS_PER_WEEK);
    while (week.length < DAYS_PER_WEEK) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export function weekdayInitials(locale: string): Array<{ short: string; long: string }> {
  const short = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  const long = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => {
    const day = new Date(FIRST_MONDAY + index * DAY_MS);
    return {
      short: short.format(day).replace('.', '').slice(0, 2),
      long: long.format(day),
    };
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function utcNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function monthTitle(view: MonthView, locale: string): string {
  return capitalize(
    new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(Date.UTC(view.year, view.month - 1, 15))
    )
  );
}

export function dayLabel(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcNoon(iso));
}

export function formatDateTimeLabel(
  value: DateTimeValue,
  locale: string,
  currentYear: number
): string {
  if (!value.date) return value.time;
  const withYear = monthOf(value.date).year !== currentYear;
  const day = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : null),
    timeZone: 'UTC',
  }).format(utcNoon(value.date));
  return value.time ? `${capitalize(day)}, ${value.time}` : capitalize(day);
}

export function timeSlots(current: string): string[] {
  const slots: string[] = [];
  for (let minutes = 0; minutes < MINUTES_PER_DAY; minutes += TIME_STEP_MINUTES) {
    slots.push(`${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`);
  }
  if (current && !slots.includes(current)) {
    slots.push(current);
    slots.sort((left, right) => left.localeCompare(right));
  }
  return slots;
}

const TYPED_TIME = /^(\d{1,2})(?:\s*[:hH.]\s*(\d{2})?)?$/;
const COMPACT_TIME = /^(\d{1,2})(\d{2})$/;

export function parseTypedTime(raw: string): string | null {
  const text = raw.trim();
  const match = TYPED_TIME.exec(text) ?? COMPACT_TIME.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  if (hours > 23 || minutes > 59) return null;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

export function isDayOutside(iso: string, min: string | undefined, max: string | undefined) {
  return (min !== undefined && iso < min) || (max !== undefined && iso > max);
}

export function clampDay(iso: string, min: string | undefined, max: string | undefined): string {
  if (min !== undefined && iso < min) return min;
  if (max !== undefined && iso > max) return max;
  return iso;
}

function daysInMonth(view: MonthView): number {
  return new Date(Date.UTC(view.year, view.month, 0)).getUTCDate();
}

export function dayNumber(iso: string): number {
  return Number(iso.slice(8, 10));
}

export function focusableDayIn(
  view: MonthView,
  wantedDay: number,
  min: string | undefined,
  max: string | undefined
): string {
  const length = daysInMonth(view);
  const wanted = clampDay(isoDay(view.year, view.month, Math.min(wantedDay, length)), min, max);
  if (compareMonths(monthOf(wanted), view) === 0) return wanted;
  for (let day = 1; day <= length; day++) {
    const iso = isoDay(view.year, view.month, day);
    if (!isDayOutside(iso, min, max)) return iso;
  }
  return wanted;
}

function weekdayIndex(iso: string): number {
  return (new Date(`${iso}T12:00:00Z`).getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
}

function sameDayInMonth(iso: string, delta: number): string {
  const view = shiftMonth(monthOf(iso), delta);
  return isoDay(view.year, view.month, Math.min(dayNumber(iso), daysInMonth(view)));
}

const DAY_JUMPS: Record<string, (iso: string) => string> = {
  Home: (iso) => shiftDay(iso, -weekdayIndex(iso)),
  End: (iso) => shiftDay(iso, DAYS_PER_WEEK - 1 - weekdayIndex(iso)),
  PageUp: (iso) => sameDayInMonth(iso, -1),
  PageDown: (iso) => sameDayInMonth(iso, 1),
};

export function jumpedDay(
  key: string,
  iso: string,
  min: string | undefined,
  max: string | undefined
): string | null {
  const jump = DAY_JUMPS[key];
  return jump ? clampDay(jump(iso), min, max) : null;
}

export function centeredScrollOffset({
  containerStart,
  containerSize,
  optionStart,
  optionSize,
  scroll,
}: Readonly<{
  containerStart: number;
  containerSize: number;
  optionStart: number;
  optionSize: number;
  scroll: number;
}>): number {
  return scroll + optionStart - containerStart - (containerSize - optionSize) / 2;
}
