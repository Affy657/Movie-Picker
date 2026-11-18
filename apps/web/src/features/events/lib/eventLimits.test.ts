import { describe, expect, it } from 'vitest';
import { t } from '@/shared/i18n';
import { EVENT_LIMIT_KINDS, EVENT_LIMITS, eventLimitCopy, eventLimitInputId } from './eventLimits';
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

  it('words a capped limit with its maximum', () => {
    expect(eventLimitCopy('participants', t)).toEqual({
      label: 'Participants',
      hint: 'Combien de personnes peuvent rejoindre',
      toggle: 'Limiter le nombre de participants',
      toggleHint: `Sinon, jusqu’à ${MAX_EVENT_PARTICIPANTS} personnes peuvent rejoindre la soirée.`,
      field: 'Participants max',
      fieldHint: `${MAX_EVENT_PARTICIPANTS} au maximum.`,
    });
  });

  it('gives no maximum to the vote limit', () => {
    expect(eventLimitCopy('votes', t)).toMatchObject({
      field: 'Votes par participant',
      fieldHint: undefined,
    });
  });
});
