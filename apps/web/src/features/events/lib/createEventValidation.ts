import type { Translate } from '@/shared/i18n';

export type CreateEventDraft = {
  title: string;
  date: string;
  time: string;
};

export type CreateEventFieldErrors = Partial<Record<keyof CreateEventDraft, string>>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function parseLocalDateTime(date: string, time: string): Date | null {
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) return null;
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number);
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const parsed = new Date(year, month - 1, day, hours, minutes);
  const roundTrips =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day &&
    parsed.getHours() === hours &&
    parsed.getMinutes() === minutes;
  return roundTrips ? parsed : null;
}

function isValidDate(date: string): boolean {
  return parseLocalDateTime(date, '00:00') !== null;
}

function isValidTime(time: string): boolean {
  return parseLocalDateTime('2000-01-01', time) !== null;
}

export function validateCreateEventDraft(
  draft: CreateEventDraft,
  t: Translate
): CreateEventFieldErrors {
  const errors: CreateEventFieldErrors = {};
  if (draft.title.trim().length === 0) errors.title = t('events.create.titleRequired');
  if (!isValidDate(draft.date)) errors.date = t('events.create.dateRequired');
  if (!isValidTime(draft.time)) errors.time = t('events.create.timeRequired');
  return errors;
}

export function isPastEventDateTime(date: string, time: string, now: Date): boolean {
  const moment = parseLocalDateTime(date, time);
  return moment !== null && moment.getTime() < now.getTime();
}
