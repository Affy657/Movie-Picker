import { describe, expect, it } from 'vitest';
import eventEntitySource from '../../../../../api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs?raw';
import { t } from '@/shared/i18n';
import { MAX_EVENT_PARTICIPANTS, MAX_PROPOSALS_PER_PARTICIPANT } from '@/features/events/types';
import { validateEventLimits, type EventLimitDraft } from './eventLimitValidation';

const draft: EventLimitDraft = {
  proposalLimitEnabled: true,
  maxProposals: '4',
  participantLimitEnabled: true,
  maxParticipants: '12',
  voteLimitEnabled: true,
  maxVotes: '2',
  currentParticipantCount: 0,
};

function apiCap(constantName: string): number {
  const match = new RegExp(`const int ${constantName} = (\\d+);`).exec(eventEntitySource);
  if (!match?.[1]) throw new Error(`${constantName} not found in Event.cs`);
  return Number(match[1]);
}

describe('validateEventLimits', () => {
  it('hands back the typed values', () => {
    const { errors, values } = validateEventLimits(draft, t);

    expect(errors).toEqual({});
    expect(values).toEqual({
      maxProposalsPerParticipant: 4,
      maxParticipants: 12,
      maxVotesPerParticipant: 2,
    });
  });

  it('reads only the switch as no limit, whatever the counter holds', () => {
    const { errors, values } = validateEventLimits(
      {
        ...draft,
        proposalLimitEnabled: false,
        maxProposals: 'abc',
        participantLimitEnabled: false,
        maxParticipants: '0',
        voteLimitEnabled: false,
        maxVotes: '',
      },
      t
    );

    expect(errors).toEqual({});
    expect(values).toEqual({
      maxProposalsPerParticipant: null,
      maxParticipants: null,
      maxVotesPerParticipant: null,
    });
  });

  it('keeps a value at the cap as a limit', () => {
    const { errors, values } = validateEventLimits(
      {
        ...draft,
        maxProposals: String(MAX_PROPOSALS_PER_PARTICIPANT),
        maxParticipants: String(MAX_EVENT_PARTICIPANTS),
      },
      t
    );

    expect(errors).toEqual({});
    expect(values.maxProposalsPerParticipant).toBe(MAX_PROPOSALS_PER_PARTICIPANT);
    expect(values.maxParticipants).toBe(MAX_EVENT_PARTICIPANTS);
  });

  it.each(['', '0', '1.5', 'abc'])('refuses the counter value %j on every limit', (value) => {
    const { errors } = validateEventLimits(
      { ...draft, maxProposals: value, maxParticipants: value, maxVotes: value },
      t
    );

    expect(Object.keys(errors).sort()).toEqual(['maxParticipants', 'maxProposals', 'maxVotes']);
  });

  it('refuses a value above the cap', () => {
    const { errors } = validateEventLimits(
      {
        ...draft,
        maxProposals: String(MAX_PROPOSALS_PER_PARTICIPANT + 1),
        maxParticipants: String(MAX_EVENT_PARTICIPANTS + 1),
      },
      t
    );

    expect(errors.maxProposals).toBeDefined();
    expect(errors.maxParticipants).toBeDefined();
  });

  it('refuses a capacity below the people already in', () => {
    const { errors } = validateEventLimits(
      { ...draft, maxParticipants: '3', currentParticipantCount: 5 },
      t
    );

    expect(errors.maxParticipants).toBeDefined();
  });
});

describe('caps of the limit fields', () => {
  it('never promises more participants than the API accepts', () => {
    expect(MAX_EVENT_PARTICIPANTS).toBeLessThanOrEqual(apiCap('MaxParticipantsCap'));
  });

  it('never promises more proposals than the API accepts', () => {
    expect(MAX_PROPOSALS_PER_PARTICIPANT).toBeLessThanOrEqual(
      apiCap('MaxProposalsPerParticipantCap')
    );
  });
});
