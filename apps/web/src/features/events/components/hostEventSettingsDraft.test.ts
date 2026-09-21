import { describe, it, expect } from 'vitest';
import { t } from '@/shared/i18n';
import {
  normalizeConfig,
  validateSettingsDraft,
  type SettingsDraft,
} from './hostEventSettingsDraft';
import { MAX_EVENT_PARTICIPANTS, MAX_PROPOSALS_PER_PARTICIPANT } from '@/features/events/types';

const draft: SettingsDraft = {
  eventTitle: 'Soirée',
  eventDateLocal: '2030-01-01T20:00',
  proposalLimitEnabled: true,
  maxProp: '4',
  participantLimitEnabled: true,
  maxParticipants: '12',
  voteLimitEnabled: false,
  maxVotes: '',
  winnerCount: '1',
  currentParticipantCount: 2,
  drawnWinnerCount: 0,
};

describe('validateSettingsDraft', () => {
  it('keeps the limits typed by the host', () => {
    const result = validateSettingsDraft(draft, t);

    expect(result.errors).toEqual({});
    expect(result.maxProposalsPerParticipant).toBe(4);
    expect(result.maxParticipantsValue).toBe(12);
  });

  it('reads a disabled limit as no cap, whatever the counter holds', () => {
    const result = validateSettingsDraft(
      {
        ...draft,
        proposalLimitEnabled: false,
        maxProp: 'abc',
        participantLimitEnabled: false,
        maxParticipants: '0',
      },
      t
    );

    expect(result.errors).toEqual({});
    expect(result.maxProposalsPerParticipant).toBeNull();
    expect(result.maxParticipantsValue).toBeNull();
  });

  it('reads a limit written at the cap as no cap', () => {
    const result = validateSettingsDraft(
      {
        ...draft,
        maxProp: String(MAX_PROPOSALS_PER_PARTICIPANT),
        maxParticipants: String(MAX_EVENT_PARTICIPANTS),
      },
      t
    );

    expect(result.errors).toEqual({});
    expect(result.maxProposalsPerParticipant).toBeNull();
    expect(result.maxParticipantsValue).toBeNull();
  });

  it('flags an enabled limit that is empty or out of bounds', () => {
    const result = validateSettingsDraft({ ...draft, maxProp: '', maxParticipants: '999' }, t);

    expect(result.errors.maxProposals).toBe(
      `Films par personne : nombre entier entre 1 et ${MAX_PROPOSALS_PER_PARTICIPANT}.`
    );
    expect(result.errors.maxParticipants).toBe(
      `Nombre maximum de participants : entier entre 1 et ${MAX_EVENT_PARTICIPANTS}.`
    );
  });

  it('refuses a capacity below the people already in', () => {
    const result = validateSettingsDraft(
      { ...draft, maxParticipants: '3', currentParticipantCount: 5 },
      t
    );

    expect(result.errors.maxParticipants).toBe(
      'Impossible de réduire la capacité à 3 : 5 participants sont déjà inscrits.'
    );
  });
});

describe('normalizeConfig', () => {
  it('keeps an absent limit absent instead of pinning it to the cap', () => {
    const config = normalizeConfig({
      theme: null,
      maxProposalsPerParticipant: null,
      maxParticipants: null,
      maxVotesPerParticipant: null,
      wheelMode: 'weightedByVotes',
      richSharePreview: true,
      allowSeries: false,
      recurrence: null,
      winnerCount: 1,
    });

    expect(config.maxProposalsPerParticipant).toBeNull();
    expect(config.maxParticipants).toBeNull();
  });
});
