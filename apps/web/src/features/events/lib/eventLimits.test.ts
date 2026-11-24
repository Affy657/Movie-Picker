import { describe, expect, it } from 'vitest';
import { t } from '@/shared/i18n';
import {
  EVENT_LIMIT_KINDS,
  EVENT_LIMITS,
  eventLimitInputId,
  eventLimitLabel,
  firstRuleError,
} from './eventLimits';
import { MAX_EVENT_PARTICIPANTS, MAX_PROPOSALS_PER_PARTICIPANT } from '@/features/events/types';

describe('event limits', () => {
  it('lists the three limits in the order both forms show them', () => {
    expect(EVENT_LIMIT_KINDS).toEqual(['participants', 'proposals', 'votes']);
  });

  it('caps participants and proposals, never votes', () => {
    expect(EVENT_LIMITS.participants.max).toBe(MAX_EVENT_PARTICIPANTS);
    expect(EVENT_LIMITS.proposals.max).toBe(MAX_PROPOSALS_PER_PARTICIPANT);
    expect(EVENT_LIMITS.votes.max).toBeUndefined();
  });

  it('names the counter of each form after its prefix', () => {
    expect(eventLimitInputId('create', 'participants')).toBe('create-max-participants');
    expect(eventLimitInputId('host-cfg', 'votes')).toBe('host-cfg-max-votes');
  });

  it('points at the first refused rule, in the order of the form', () => {
    expect(firstRuleError('create', {})).toBeNull();
    expect(
      firstRuleError('create', { maxVotes: 'Au moins 1 vote.', winnerCount: 'Trop de films.' })
    ).toEqual({ message: 'Au moins 1 vote.', inputId: 'create-max-votes' });
    expect(firstRuleError('host-cfg', { winnerCount: 'Trop de films.' })).toEqual({
      message: 'Trop de films.',
      inputId: 'host-cfg-winner-count',
    });
  });

  it('names each limit the way both forms show it', () => {
    expect(EVENT_LIMIT_KINDS.map((kind) => eventLimitLabel(kind, t))).toEqual([
      'Participants',
      'Films par personne',
      'Votes par personne',
    ]);
  });
});
