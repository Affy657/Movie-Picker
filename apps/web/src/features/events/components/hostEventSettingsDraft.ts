import { eventDateTimeToLocal, splitDateTimeLocal } from '@/shared/utils/eventDateTimeLocal';
import type { Translate } from '@/shared/i18n';
import type {
  EventConfigData,
  EventConfigPatchPayload,
  EventData,
  EventRecurrence,
  WheelMode,
} from '@/features/events/types';
import { DEFAULT_EVENT_CONFIG, MAX_WINNERS_PER_EVENT } from '@/features/events/types';
import { positiveLimit } from '@/features/events/lib/eventTemplateDraft';
import {
  validateEventLimits,
  type EventLimitDraft,
  type EventLimitErrors,
} from '@/features/events/lib/eventLimitValidation';
import {
  eventStartIssue,
  eventStartIssueMessage,
  isValidDate,
  isValidTime,
} from '@/features/events/lib/createEventValidation';

export type FieldErrors = EventLimitErrors & {
  title?: string;
  date?: string;
  winnerCount?: string;
};

export type SaveState = 'saved' | 'pending' | 'error';

export function recurrencePatch(
  next: EventRecurrence | null,
  current: EventRecurrence | null
): Partial<EventConfigPatchPayload> {
  if (next === current) return {};
  return next === null ? { clearRecurrence: true } : { recurrence: next };
}

export function groupPatch(
  next: string | null,
  current: string | null
): Partial<EventConfigPatchPayload> {
  if (next === current) return {};
  return next === null ? { clearGroup: true } : { groupId: next };
}

export function titlePatch(next: string, current: string): Partial<EventConfigPatchPayload> {
  return next !== current ? { title: next } : {};
}

export function dateTimePatch(
  parsed: ReturnType<typeof splitDateTimeLocal>,
  edited: boolean,
  notifyParticipants: boolean
): Partial<EventConfigPatchPayload> {
  if (!parsed || !edited) return {};
  return {
    date: parsed.date,
    time: parsed.time,
    notifyParticipantsOfDateChange: notifyParticipants,
  };
}

export function isCreatorParticipant(
  myParticipant: EventData['myParticipant'],
  participants: EventData['participants']
): boolean {
  if (!myParticipant) return false;
  const myId = myParticipant.id;
  return !!participants?.find((p) => p.id === myId)?.isCreator;
}

export function normalizeConfig(c: EventConfigData | undefined): EventConfigData {
  return {
    theme: c?.theme ?? DEFAULT_EVENT_CONFIG.theme,
    maxProposalsPerParticipant: positiveLimit(c?.maxProposalsPerParticipant),
    maxParticipants: positiveLimit(c?.maxParticipants),
    maxVotesPerParticipant: c?.maxVotesPerParticipant ?? null,
    wheelMode: c?.wheelMode ?? DEFAULT_EVENT_CONFIG.wheelMode,
    richSharePreview: c?.richSharePreview ?? DEFAULT_EVENT_CONFIG.richSharePreview,
    allowSeries: c?.allowSeries ?? DEFAULT_EVENT_CONFIG.allowSeries,
    recurrence: c?.recurrence ?? null,
    hasNextOccurrence: c?.hasNextOccurrence ?? false,
    groupId: c?.groupId ?? null,
    winnerCount: c?.winnerCount ?? DEFAULT_EVENT_CONFIG.winnerCount,
  };
}

export type SavedSettings = {
  title: string;
  theme: string;
  maxProposalsPerParticipant: number | null;
  maxParticipants: number | null;
  maxVotesPerParticipant: number | null;
  wheelMode: WheelMode;
  allowSeries: boolean;
  richSharePreview: boolean;
  winnerCount: number;
  recurrence: EventRecurrence | null;
  groupId: string | null;
  dateLocal: string;
};

export function savedSettingsOf(event: EventData): SavedSettings {
  const cfg = normalizeConfig(event.config);
  return {
    title: event.title,
    theme: cfg.theme ?? '',
    maxProposalsPerParticipant: cfg.maxProposalsPerParticipant,
    maxParticipants: cfg.maxParticipants,
    maxVotesPerParticipant: cfg.maxVotesPerParticipant ?? null,
    wheelMode: cfg.wheelMode,
    allowSeries: cfg.allowSeries ?? false,
    richSharePreview: cfg.richSharePreview ?? true,
    winnerCount: cfg.winnerCount,
    recurrence: cfg.recurrence ?? null,
    groupId: cfg.groupId ?? null,
    dateLocal: eventDateTimeToLocal(event.date, event.time),
  };
}

function limitPatch(
  key: 'maxProposalsPerParticipant' | 'maxParticipants' | 'maxVotesPerParticipant',
  next: SavedSettings,
  saved: SavedSettings
): Partial<EventConfigPatchPayload> {
  return next[key] === saved[key] ? {} : { [key]: next[key] ?? 0 };
}

function valuePatch(
  key: 'theme' | 'wheelMode' | 'allowSeries' | 'richSharePreview' | 'winnerCount',
  next: SavedSettings,
  saved: SavedSettings
): Partial<EventConfigPatchPayload> {
  return next[key] === saved[key] ? {} : { [key]: next[key] };
}

export function settingsPatch(
  next: SavedSettings,
  saved: SavedSettings,
  notifyParticipants: boolean
): EventConfigPatchPayload {
  return {
    ...titlePatch(next.title, saved.title),
    ...valuePatch('theme', next, saved),
    ...limitPatch('maxProposalsPerParticipant', next, saved),
    ...limitPatch('maxParticipants', next, saved),
    ...limitPatch('maxVotesPerParticipant', next, saved),
    ...valuePatch('wheelMode', next, saved),
    ...valuePatch('allowSeries', next, saved),
    ...valuePatch('richSharePreview', next, saved),
    ...valuePatch('winnerCount', next, saved),
    ...recurrencePatch(next.recurrence, saved.recurrence),
    ...groupPatch(next.groupId, saved.groupId),
    ...dateTimePatch(
      splitDateTimeLocal(next.dateLocal),
      next.dateLocal !== saved.dateLocal,
      notifyParticipants
    ),
  };
}

export type SettingsDraft = EventLimitDraft & {
  eventTitle: string;
  eventDateLocal: string;
  savedEventDateLocal?: string;
  winnerCount: string;
  drawnWinnerCount: number;
};

function validateTitle(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  if (!draft.eventTitle.trim()) errors.title = t('events.settings.titleRequired');
}

function eventDateLocalFormatError(value: string, t: Translate): string | undefined {
  if (!value.trim()) return t('events.settings.dateRequired');
  const parsed = splitDateTimeLocal(value);
  if (!parsed || !isValidDate(parsed.date) || !isValidTime(parsed.time)) {
    return t('events.settings.dateInvalid');
  }
  return undefined;
}

export function eventDateLocalError(value: string, t: Translate, now: Date): string | undefined {
  const formatError = eventDateLocalFormatError(value, t);
  if (formatError) return formatError;
  const parsed = splitDateTimeLocal(value);
  const issue = parsed ? eventStartIssue(parsed.date, parsed.time, now) : null;
  return issue ? eventStartIssueMessage(issue, t, 'settings') : undefined;
}

function validateDate(draft: SettingsDraft, t: Translate, errors: FieldErrors, now: Date) {
  const unchanged = draft.eventDateLocal === draft.savedEventDateLocal;
  const error = unchanged
    ? eventDateLocalFormatError(draft.eventDateLocal, t)
    : eventDateLocalError(draft.eventDateLocal, t, now);
  if (error) {
    errors.date = error;
    return null;
  }
  return splitDateTimeLocal(draft.eventDateLocal);
}

function validateWinnerCount(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  const value = Number(draft.winnerCount);
  const withinBounds =
    draft.winnerCount.trim() !== '' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_WINNERS_PER_EVENT;

  if (!withinBounds) {
    errors.winnerCount = t('events.settings.winnerCountInvalid', { max: MAX_WINNERS_PER_EVENT });
    return null;
  }

  if (value < draft.drawnWinnerCount) {
    errors.winnerCount = t('events.settings.winnerCountLockedHint', {
      count: draft.drawnWinnerCount,
    });
    return null;
  }

  return value;
}

export function validateSettingsDraft(draft: SettingsDraft, t: Translate, now: Date) {
  const limits = validateEventLimits(draft, t);
  const errors: FieldErrors = { ...limits.errors };
  validateTitle(draft, t, errors);
  const eventDateTime = validateDate(draft, t, errors, now);
  const winnerCount = validateWinnerCount(draft, t, errors);
  return {
    errors,
    maxProposalsPerParticipant: limits.values.maxProposalsPerParticipant,
    maxParticipantsValue: limits.values.maxParticipants,
    maxVotesPerParticipant: limits.values.maxVotesPerParticipant,
    winnerCount,
    eventDateTime,
  };
}
