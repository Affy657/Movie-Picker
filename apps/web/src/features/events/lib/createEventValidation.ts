import type { Translate, TranslationKey } from '@/shared/i18n';
import { eventScheduledStartUtcMs, eventWallClockAt } from '@/shared/utils/eventScheduled';
import type { EventLimitErrors } from './eventLimitValidation';

export type CreateEventDraft = {
  title: string;
  date: string;
  time: string;
};

export type CreateEventFieldErrors = Partial<Record<keyof CreateEventDraft, string>> &
  EventLimitErrors;

export type EventStartIssue = 'tooEarly' | 'tooFar';

export const MAX_YEARS_AHEAD = 2;

const MINUTE_MS = 60 * 1000;
const PENDING_DELAY_MS = 2 * 60 * MINUTE_MS;
const AUTO_CLOSE_DELAY_MS = 7 * 24 * 60 * MINUTE_MS;
const OPEN_WINDOW_MS = PENDING_DELAY_MS + AUTO_CLOSE_DELAY_MS;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function isValidDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false;
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function isValidTime(time: string): boolean {
  if (!TIME_PATTERN.test(time)) return false;
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours < 24 && minutes < 60;
}

export function latestEventDate(now: Date): string {
  const today = eventWallClockAt(now.getTime());
  return `${today.year + MAX_YEARS_AHEAD}-${pad2(today.month)}-${pad2(today.day)}`;
}

export function earliestOpenStartLocal(now: Date): string {
  const closingMs = now.getTime() - OPEN_WINDOW_MS;
  const firstOpenMinuteMs = Math.floor(closingMs / MINUTE_MS) * MINUTE_MS + MINUTE_MS;
  const wall = eventWallClockAt(firstOpenMinuteMs);
  return `${wall.year}-${pad2(wall.month)}-${pad2(wall.day)}T${pad2(wall.hour)}:${pad2(wall.minute)}`;
}

export function eventStartIssue(date: string, time: string, now: Date): EventStartIssue | null {
  if (!isValidDate(date) || !isValidTime(time)) return null;
  if (date > latestEventDate(now)) return 'tooFar';
  const startMs = eventScheduledStartUtcMs({ date, time });
  if (startMs === null) return null;
  return now.getTime() >= startMs + OPEN_WINDOW_MS ? 'tooEarly' : null;
}

const START_ISSUE_KEYS = {
  create: { tooEarly: 'events.create.dateTooEarly', tooFar: 'events.create.dateTooFar' },
  settings: { tooEarly: 'events.settings.dateTooEarly', tooFar: 'events.settings.dateTooFar' },
} as const satisfies Record<string, Record<EventStartIssue, TranslationKey>>;

export function eventStartIssueMessage(
  issue: EventStartIssue,
  t: Translate,
  scope: keyof typeof START_ISSUE_KEYS
): string {
  return t(START_ISSUE_KEYS[scope][issue], { years: MAX_YEARS_AHEAD });
}

export function validateCreateEventDraft(
  draft: CreateEventDraft,
  t: Translate,
  now: Date
): CreateEventFieldErrors {
  const errors: CreateEventFieldErrors = {};
  if (draft.title.trim().length === 0) errors.title = t('events.create.titleRequired');
  if (!isValidDate(draft.date)) errors.date = t('events.create.dateRequired');
  if (!isValidTime(draft.time)) errors.time = t('events.create.timeRequired');
  const issue = eventStartIssue(draft.date, draft.time, now);
  if (issue) errors.date = eventStartIssueMessage(issue, t, 'create');
  return errors;
}

export function isPastEventDateTime(date: string, time: string, now: Date): boolean {
  if (!isValidDate(date) || !isValidTime(time)) return false;
  const startMs = eventScheduledStartUtcMs({ date, time });
  return startMs !== null && startMs < now.getTime();
}
