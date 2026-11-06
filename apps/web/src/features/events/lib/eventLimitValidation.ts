import type { Translate } from '@/shared/i18n';
import { MAX_EVENT_PARTICIPANTS, MAX_PROPOSALS_PER_PARTICIPANT } from '@/features/events/types';

export type EventLimitDraft = {
  proposalLimitEnabled: boolean;
  maxProposals: string;
  participantLimitEnabled: boolean;
  maxParticipants: string;
  voteLimitEnabled: boolean;
  maxVotes: string;
  currentParticipantCount: number;
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

function isWholeNumberWithin(raw: string, max: number): boolean {
  return isWholeNumberFrom1(raw) && Number(raw) <= max;
}

function validateMaxProposals(
  draft: EventLimitDraft,
  t: Translate,
  errors: EventLimitErrors
): number | null {
  if (!draft.proposalLimitEnabled) return null;
  if (isWholeNumberWithin(draft.maxProposals, MAX_PROPOSALS_PER_PARTICIPANT)) {
    return Number(draft.maxProposals);
  }
  errors.maxProposals = t('events.settings.maxProposalsInvalid', {
    max: MAX_PROPOSALS_PER_PARTICIPANT,
  });
  return null;
}

function validateMaxParticipants(
  draft: EventLimitDraft,
  t: Translate,
  errors: EventLimitErrors
): number | null {
  if (!draft.participantLimitEnabled) return null;
  if (!isWholeNumberWithin(draft.maxParticipants, MAX_EVENT_PARTICIPANTS)) {
    errors.maxParticipants = t('events.settings.maxParticipantsInvalid', {
      max: MAX_EVENT_PARTICIPANTS,
    });
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
