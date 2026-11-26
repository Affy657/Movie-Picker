import type { Translate } from '@/shared/i18n';
import type { EventLimitCaps } from '@/features/events/types';

export type EventLimitDraft = {
  proposalLimitEnabled: boolean;
  maxProposals: string;
  participantLimitEnabled: boolean;
  maxParticipants: string;
  voteLimitEnabled: boolean;
  maxVotes: string;
  currentParticipantCount: number;
  caps: EventLimitCaps | null;
};

export type EventLimitErrors = {
  maxProposals?: string;
  maxParticipants?: string;
  maxVotes?: string;
};

export type EventLimitValues = {
  maxProposalsPerParticipant: number | null;
  maxParticipants: number | null;
  maxVotesPerParticipant: number | null;
};

function isWholeNumberFrom1(raw: string): boolean {
  const value = Number(raw);
  return raw.trim() !== '' && Number.isInteger(value) && value >= 1;
}

function isWholeNumberWithin(raw: string, max: number | undefined): boolean {
  return isWholeNumberFrom1(raw) && (max === undefined || Number(raw) <= max);
}

function outOfRangeMessage(
  t: Translate,
  withinCap: 'events.settings.maxProposalsInvalid' | 'events.settings.maxParticipantsInvalid',
  fromOne: 'events.settings.maxProposalsNotWhole' | 'events.settings.maxParticipantsNotWhole',
  max: number | undefined
): string {
  return max === undefined ? t(fromOne) : t(withinCap, { max });
}

function validateMaxProposals(
  draft: EventLimitDraft,
  t: Translate,
  errors: EventLimitErrors
): number | null {
  if (!draft.proposalLimitEnabled) return null;
  const max = draft.caps?.maxProposalsPerParticipant;
  if (isWholeNumberWithin(draft.maxProposals, max)) return Number(draft.maxProposals);
  errors.maxProposals = outOfRangeMessage(
    t,
    'events.settings.maxProposalsInvalid',
    'events.settings.maxProposalsNotWhole',
    max
  );
  return null;
}

function validateMaxParticipants(
  draft: EventLimitDraft,
  t: Translate,
  errors: EventLimitErrors
): number | null {
  if (!draft.participantLimitEnabled) return null;
  const max = draft.caps?.maxParticipants;
  if (!isWholeNumberWithin(draft.maxParticipants, max)) {
    errors.maxParticipants = outOfRangeMessage(
      t,
      'events.settings.maxParticipantsInvalid',
      'events.settings.maxParticipantsNotWhole',
      max
    );
    return null;
  }

  const value = Number(draft.maxParticipants);
  if (value < draft.currentParticipantCount) {
    errors.maxParticipants = t('events.settings.maxParticipantsBelowCurrent', {
      value,
      count: draft.currentParticipantCount,
    });
    return null;
  }

  return value;
}

function validateMaxVotes(
  draft: EventLimitDraft,
  t: Translate,
  errors: EventLimitErrors
): number | null {
  if (!draft.voteLimitEnabled) return null;
  if (isWholeNumberFrom1(draft.maxVotes)) return Number(draft.maxVotes);
  errors.maxVotes = t('events.settings.maxVotesInvalid');
  return null;
}

export function validateEventLimits(
  draft: EventLimitDraft,
  t: Translate
): { errors: EventLimitErrors; values: EventLimitValues } {
  const errors: EventLimitErrors = {};
  const values: EventLimitValues = {
    maxProposalsPerParticipant: validateMaxProposals(draft, t, errors),
    maxParticipants: validateMaxParticipants(draft, t, errors),
    maxVotesPerParticipant: validateMaxVotes(draft, t, errors),
  };
  return { errors, values };
}
