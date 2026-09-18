import { splitDateTimeLocal } from '@/shared/utils/eventDateTimeLocal';
import type { Translate } from '@/shared/i18n';
import type {
  EventConfigData,
  EventConfigPatchPayload,
  EventData,
  EventRecurrence,
} from '@/features/events/types';
import {
  DEFAULT_EVENT_CONFIG,
  MAX_EVENT_PARTICIPANTS,
  MAX_PROPOSALS_PER_PARTICIPANT,
  MAX_WINNERS_PER_EVENT,
} from '@/features/events/types';

export type FieldErrors = {
  title?: string;
  date?: string;
  maxProposals?: string;
  maxParticipants?: string;
  maxVotes?: string;
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
    maxProposalsPerParticipant: c?.maxProposalsPerParticipant ?? MAX_PROPOSALS_PER_PARTICIPANT,
    maxParticipants: c?.maxParticipants ?? MAX_EVENT_PARTICIPANTS,
    maxVotesPerParticipant: c?.maxVotesPerParticipant ?? null,
    wheelMode: c?.wheelMode ?? DEFAULT_EVENT_CONFIG.wheelMode,
    richSharePreview: c?.richSharePreview ?? DEFAULT_EVENT_CONFIG.richSharePreview,
    allowSeries: c?.allowSeries ?? DEFAULT_EVENT_CONFIG.allowSeries,
    recurrence: c?.recurrence ?? null,
    hasNextOccurrence: c?.hasNextOccurrence ?? false,
    winnerCount: c?.winnerCount ?? DEFAULT_EVENT_CONFIG.winnerCount,
  };
}

export type SettingsDraft = {
  eventTitle: string;
  eventDateLocal: string;
  maxProp: string;
  maxParticipants: string;
  voteLimitEnabled: boolean;
  maxVotes: string;
  winnerCount: string;
  currentParticipantCount: number;
  drawnWinnerCount: number;
};

function validateTitle(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  if (!draft.eventTitle.trim()) errors.title = t('events.settings.titleRequired');
}

function validateDate(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  const trimmed = draft.eventDateLocal.trim();
  if (!trimmed) {
    errors.date = t('events.settings.dateRequired');
    return null;
  }
  const parsed = splitDateTimeLocal(draft.eventDateLocal);
  if (!parsed) errors.date = t('events.settings.dateInvalid');
  return parsed;
}

function validateMaxProposals(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  const value = Number(draft.maxProp);
  const valid =
    draft.maxProp.trim() !== '' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_PROPOSALS_PER_PARTICIPANT;
  if (valid) return value;
  errors.maxProposals = t('events.settings.maxProposalsInvalid', {
    max: MAX_PROPOSALS_PER_PARTICIPANT,
  });
  return MAX_PROPOSALS_PER_PARTICIPANT;
}

function validateMaxParticipants(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  const value = Number(draft.maxParticipants);
  const withinBounds =
    draft.maxParticipants.trim() !== '' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_EVENT_PARTICIPANTS;

  if (!withinBounds) {
    errors.maxParticipants = t('events.settings.maxParticipantsInvalid', {
      max: MAX_EVENT_PARTICIPANTS,
    });
    return MAX_EVENT_PARTICIPANTS;
  }

  if (value < draft.currentParticipantCount) {
    errors.maxParticipants = t('events.settings.maxParticipantsBelowCurrent', {
      value,
      count: draft.currentParticipantCount,
    });
    return MAX_EVENT_PARTICIPANTS;
  }

  return value;
}

export function maxParticipantsHintFor(participantCount: number, t: Translate): string {
  if (participantCount === 1) {
    return t('events.settings.maxParticipantsHintOne', { max: MAX_EVENT_PARTICIPANTS });
  }
  return t('events.settings.maxParticipantsHintMany', {
    count: participantCount,
    max: MAX_EVENT_PARTICIPANTS,
  });
}

function validateMaxVotes(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  if (!draft.voteLimitEnabled) return null;
  const value = Number(draft.maxVotes.trim());
  if (draft.maxVotes.trim() !== '' && Number.isInteger(value) && value >= 1) return value;
  errors.maxVotes = t('events.settings.maxVotesInvalid');
  return null;
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

export function validateSettingsDraft(draft: SettingsDraft, t: Translate) {
  const errors: FieldErrors = {};
  validateTitle(draft, t, errors);
  const eventDateTime = validateDate(draft, t, errors);
  const maxProposalsPerParticipant = validateMaxProposals(draft, t, errors);
  const maxParticipantsValue = validateMaxParticipants(draft, t, errors);
  const maxVotesPerParticipant = validateMaxVotes(draft, t, errors);
  const winnerCount = validateWinnerCount(draft, t, errors);
  return {
    errors,
    maxProposalsPerParticipant,
    maxParticipantsValue,
    maxVotesPerParticipant,
    winnerCount,
    eventDateTime,
  };
}
