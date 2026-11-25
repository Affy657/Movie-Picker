import { describe, expect, it } from 'vitest';
import { t } from '@/shared/i18n';
import type { EventLimitCaps } from '@/features/events/types';
import { validateEventLimits, type EventLimitDraft } from './eventLimitValidation';

const servedCaps: EventLimitCaps = { maxParticipants: 50, maxProposalsPerParticipant: 15 };

const draft: EventLimitDraft = {
  proposalLimitEnabled: true,
  maxProposals: '4',
  participantLimitEnabled: true,
  maxParticipants: '12',
  voteLimitEnabled: true,
  maxVotes: '2',
  currentParticipantCount: 0,
  caps: servedCaps,
};

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

  it('keeps a value at the cap the API serves as a limit', () => {
    const { errors, values } = validateEventLimits(
      { ...draft, maxProposals: '15', maxParticipants: '50' },
      t
    );

    expect(errors).toEqual({});
    expect(values.maxProposalsPerParticipant).toBe(15);
    expect(values.maxParticipants).toBe(50);
  });

  it.each(['', '0', '1.5', 'abc'])('refuses the counter value %j on every limit', (value) => {
    const { errors } = validateEventLimits(
      { ...draft, maxProposals: value, maxParticipants: value, maxVotes: value },
      t
    );

    expect(Object.keys(errors).sort()).toEqual(['maxParticipants', 'maxProposals', 'maxVotes']);
  });

  it('refuses a value above the cap the API serves, naming that cap', () => {
    const { errors } = validateEventLimits(
      { ...draft, maxProposals: '16', maxParticipants: '51' },
      t
    );

    expect(errors.maxProposals).toBe('Films par personne : nombre entier entre 1 et 15.');
    expect(errors.maxParticipants).toBe('Nombre maximum de participants : entier entre 1 et 50.');
  });

  it('follows the caps the API serves, whatever they are', () => {
    const { errors } = validateEventLimits(
      {
        ...draft,
        maxProposals: '16',
        maxParticipants: '51',
        caps: { maxParticipants: 80, maxProposalsPerParticipant: 20 },
      },
      t
    );

    expect(errors).toEqual({});
  });

  it('leaves the upper bound to the API until it has served its caps', () => {
    const { errors, values } = validateEventLimits(
      { ...draft, maxProposals: '400', maxParticipants: '9000', caps: null },
      t
    );

    expect(errors).toEqual({});
    expect(values.maxProposalsPerParticipant).toBe(400);
    expect(values.maxParticipants).toBe(9000);
  });

  it('still refuses an unusable value before the caps are known, without naming a cap', () => {
    const { errors } = validateEventLimits(
      { ...draft, maxProposals: '1.5', maxParticipants: '0', caps: null },
      t
    );

    expect(errors.maxProposals).toBe('Films par personne : nombre entier à partir de 1.');
    expect(errors.maxParticipants).toBe('Nombre maximum de participants : entier à partir de 1.');
  });

  it('refuses a capacity below the people already in', () => {
    const { errors } = validateEventLimits(
      { ...draft, maxParticipants: '3', currentParticipantCount: 5 },
      t
    );

    expect(errors.maxParticipants).toBeDefined();
  });
});
