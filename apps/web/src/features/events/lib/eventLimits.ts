import type { Translate } from '@/shared/i18n';
import {
  DEFAULT_PARTICIPANT_LIMIT,
  DEFAULT_PROPOSAL_LIMIT,
  DEFAULT_VOTE_LIMIT,
  type EventLimitCaps,
} from '@/features/events/types';

export type EventLimitKind = 'participants' | 'proposals' | 'votes';

export interface EventLimitSpec {
  enabledField: 'participantLimitEnabled' | 'proposalLimitEnabled' | 'voteLimitEnabled';
  valueField: 'maxParticipants' | 'maxProposals' | 'maxVotes';
  idSuffix: string;
  fallback: number;
}

export const EVENT_LIMIT_KINDS: readonly EventLimitKind[] = ['participants', 'proposals', 'votes'];

export const EVENT_LIMITS: Readonly<Record<EventLimitKind, EventLimitSpec>> = {
  participants: {
    enabledField: 'participantLimitEnabled',
    valueField: 'maxParticipants',
    idSuffix: 'max-participants',
    fallback: DEFAULT_PARTICIPANT_LIMIT,
  },
  proposals: {
    enabledField: 'proposalLimitEnabled',
    valueField: 'maxProposals',
    idSuffix: 'max-proposals',
    fallback: DEFAULT_PROPOSAL_LIMIT,
  },
  votes: {
    enabledField: 'voteLimitEnabled',
    valueField: 'maxVotes',
    idSuffix: 'max-votes',
    fallback: DEFAULT_VOTE_LIMIT,
  },
};

export function eventLimitMax(
  kind: EventLimitKind,
  caps: EventLimitCaps | null
): number | undefined {
  if (kind === 'participants') return caps?.maxParticipants;
  if (kind === 'proposals') return caps?.maxProposalsPerParticipant;
  return undefined;
}

export function eventLimitInputId(idPrefix: string, kind: EventLimitKind): string {
  return `${idPrefix}-${EVENT_LIMITS[kind].idSuffix}`;
}

export function eventLimitLabel(kind: EventLimitKind, t: Translate): string {
  return t(`events.limits.${kind}.label`);
}

export type RuleErrors = Partial<Record<EventLimitSpec['valueField'] | 'winnerCount', string>>;

export function winnerCountInputId(idPrefix: string): string {
  return `${idPrefix}-winner-count`;
}

export function firstRuleError(
  idPrefix: string,
  errors: RuleErrors
): { message: string; inputId: string } | null {
  for (const kind of EVENT_LIMIT_KINDS) {
    const message = errors[EVENT_LIMITS[kind].valueField];
    if (message) return { message, inputId: eventLimitInputId(idPrefix, kind) };
  }
  if (!errors.winnerCount) return null;
  return { message: errors.winnerCount, inputId: winnerCountInputId(idPrefix) };
}
