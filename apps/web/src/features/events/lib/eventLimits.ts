import type { Translate } from '@/shared/i18n';
import {
  DEFAULT_PARTICIPANT_LIMIT,
  DEFAULT_PROPOSAL_LIMIT,
  DEFAULT_VOTE_LIMIT,
  MAX_EVENT_PARTICIPANTS,
  MAX_PROPOSALS_PER_PARTICIPANT,
} from '@/features/events/types';

export type EventLimitKind = 'participants' | 'proposals' | 'votes';

export interface EventLimitSpec {
  enabledField: 'participantLimitEnabled' | 'proposalLimitEnabled' | 'voteLimitEnabled';
  valueField: 'maxParticipants' | 'maxProposals' | 'maxVotes';
  idSuffix: string;
  fallback: number;
  max?: number;
}

export const EVENT_LIMIT_KINDS: readonly EventLimitKind[] = ['participants', 'proposals', 'votes'];

export const EVENT_LIMITS: Readonly<Record<EventLimitKind, EventLimitSpec>> = {
  participants: {
    enabledField: 'participantLimitEnabled',
    valueField: 'maxParticipants',
    idSuffix: 'max-participants',
    fallback: DEFAULT_PARTICIPANT_LIMIT,
    max: MAX_EVENT_PARTICIPANTS,
  },
  proposals: {
    enabledField: 'proposalLimitEnabled',
    valueField: 'maxProposals',
    idSuffix: 'max-proposals',
    fallback: DEFAULT_PROPOSAL_LIMIT,
    max: MAX_PROPOSALS_PER_PARTICIPANT,
  },
  votes: {
    enabledField: 'voteLimitEnabled',
    valueField: 'maxVotes',
    idSuffix: 'max-votes',
    fallback: DEFAULT_VOTE_LIMIT,
  },
};

export function eventLimitInputId(idPrefix: string, kind: EventLimitKind): string {
  return `${idPrefix}-${EVENT_LIMITS[kind].idSuffix}`;
}

export function eventLimitCopy(kind: EventLimitKind, t: Translate) {
  const { max } = EVENT_LIMITS[kind];
  const vars = max === undefined ? undefined : { max };
  return {
    label: t(`events.limits.${kind}.label`),
    hint: t(`events.limits.${kind}.hint`),
    toggle: t(`events.limits.${kind}.toggle`),
    toggleHint: t(`events.limits.${kind}.toggleHint`, vars),
    field: t(`events.limits.${kind}.field`),
    fieldHint: vars ? t('events.limits.capHint', vars) : undefined,
  };
}
