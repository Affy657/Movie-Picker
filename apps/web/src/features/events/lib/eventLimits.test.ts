import { describe, expect, it } from 'vitest';
import { t } from '@/shared/i18n';
import {
  EVENT_LIMIT_KINDS,
  eventLimitInputId,
  eventLimitLabel,
  eventLimitMax,
  firstRuleError,
} from './eventLimits';

describe('event limits', () => {
  it('lists the three limits in the order both forms show them', () => {
    expect(EVENT_LIMIT_KINDS).toEqual(['participants', 'proposals', 'votes']);
  });

  it('caps participants and proposals at what the API serves, never votes', () => {
    const caps = { maxParticipants: 50, maxProposalsPerParticipant: 15 };

    expect(eventLimitMax('participants', caps)).toBe(50);
    expect(eventLimitMax('proposals', caps)).toBe(15);
    expect(eventLimitMax('votes', caps)).toBeUndefined();
  });

  it('leaves every counter open until the API has served its caps', () => {
    expect(EVENT_LIMIT_KINDS.map((kind) => eventLimitMax(kind, null))).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
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
