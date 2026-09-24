import type { Translate } from '@/shared/i18n';
import { eventScheduledStartUtcMs } from '@/shared/utils/eventScheduled';

export type CreateEventDraft = {
  title: string;
  date: string;
  time: string;
};

export type CreateEventFieldErrors = Partial<Record<keyof CreateEventDraft, string>>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function isValidDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false;
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isValidTime(time: string): boolean {
  if (!TIME_PATTERN.test(time)) return false;
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours < 24 && minutes < 60;
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
  if (!isValidDate(date) || !isValidTime(time)) return false;
  const startMs = eventScheduledStartUtcMs({ date, time });
  return startMs !== null && startMs < now.getTime();
}
