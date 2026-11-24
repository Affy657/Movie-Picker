import { describe, it, expect } from 'vitest';
import { t } from '@/shared/i18n';
import {
  normalizeConfig,
  eventDateLocalError,
  validateSettingsDraft,
  type SettingsDraft,
  groupPatch,
} from './hostEventSettingsDraft';
import { MAX_EVENT_PARTICIPANTS, MAX_PROPOSALS_PER_PARTICIPANT } from '@/features/events/types';

const draft: SettingsDraft = {
  eventTitle: 'Soirée',
  eventDateLocal: '2030-01-01T20:00',
  proposalLimitEnabled: true,
  maxProposals: '4',
  participantLimitEnabled: true,
  maxParticipants: '12',
  voteLimitEnabled: false,
  maxVotes: '',
  winnerCount: '1',
  currentParticipantCount: 2,
  drawnWinnerCount: 0,
};

const planningDay = new Date('2029-06-01T12:00:00Z');

describe('validateSettingsDraft', () => {
  it('saves the other settings of a night whose unchanged date is now out of reach', () => {
    const result = validateSettingsDraft(
      { ...draft, eventDateLocal: '2062-01-01T20:00', savedEventDateLocal: '2062-01-01T20:00' },
      t,
      planningDay
    );

    expect(result.errors).toEqual({});
  });

  it('still refuses a date moved out of reach', () => {
    const result = validateSettingsDraft(
      { ...draft, eventDateLocal: '2062-01-01T20:00', savedEventDateLocal: '2030-01-01T20:00' },
      t,
      planningDay
    );

    expect(result.errors.date).toBeDefined();
  });

  it('keeps the limits typed by the host', () => {
    const result = validateSettingsDraft(draft, t, planningDay);

    expect(result.errors).toEqual({});
    expect(result.maxProposalsPerParticipant).toBe(4);
    expect(result.maxParticipantsValue).toBe(12);
  });

  it('reads a disabled limit as no cap, whatever the counter holds', () => {
    const result = validateSettingsDraft(
      {
        ...draft,
        proposalLimitEnabled: false,
        maxProposals: 'abc',
        participantLimitEnabled: false,
        maxParticipants: '0',
      },
      t,
      planningDay
    );

    expect(result.errors).toEqual({});
    expect(result.maxProposalsPerParticipant).toBeNull();
    expect(result.maxParticipantsValue).toBeNull();
  });

  it('keeps a limit written at the cap', () => {
    const result = validateSettingsDraft(
      {
        ...draft,
        maxProposals: String(MAX_PROPOSALS_PER_PARTICIPANT),
        maxParticipants: String(MAX_EVENT_PARTICIPANTS),
      },
      t,
      planningDay
    );

    expect(result.errors).toEqual({});
    expect(result.maxProposalsPerParticipant).toBe(MAX_PROPOSALS_PER_PARTICIPANT);
    expect(result.maxParticipantsValue).toBe(MAX_EVENT_PARTICIPANTS);
  });

  it('flags an enabled limit that is empty or out of bounds', () => {
    const result = validateSettingsDraft(
      { ...draft, maxProposals: '', maxParticipants: '999' },
      t,
      planningDay
    );

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
      t,
      planningDay
    );

    expect(result.errors.maxParticipants).toBe(
      'Impossible de réduire la capacité à 3 : 5 participants sont déjà inscrits.'
    );
  });
});

describe('eventDateLocalError', () => {
  const auditDay = new Date('2026-11-23T12:00:00Z');

  it('accepts a date that keeps the night open', () => {
    expect(eventDateLocalError('2026-12-04T20:00', t, auditDay)).toBeUndefined();
    expect(eventDateLocalError('2026-11-17T20:00', t, auditDay)).toBeUndefined();
  });

  it('refuses a typo on the year that would end an upcoming night', () => {
    expect(eventDateLocalError('2025-12-04T20:00', t, auditDay)).toBe(
      'Cette date terminerait la soirée aussitôt : choisissez une date plus récente.'
    );
  });

  it('refuses an absurd year instead of showing it as saved', () => {
    expect(eventDateLocalError('200494-12-04T20:00', t, auditDay)).toBe(
      'Date et heure de la soirée invalides.'
    );
    expect(eventDateLocalError('2031-12-04T20:00', t, auditDay)).toBe(
      'Une soirée se prévoit au plus 2 ans à l’avance.'
    );
  });

  it('asks for a date when the field is empty', () => {
    expect(eventDateLocalError('  ', t, auditDay)).toBe('La date de la soirée est requise.');
  });

  it('blocks the save of a refused date', () => {
    const result = validateSettingsDraft(
      { ...draft, eventDateLocal: '2025-12-04T20:00' },
      t,
      auditDay
    );

    expect(result.errors.date).toBe(
      'Cette date terminerait la soirée aussitôt : choisissez une date plus récente.'
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

describe('groupPatch', () => {
  it('sends nothing while the group stays the same', () => {
    expect(groupPatch('g1', 'g1')).toEqual({});
    expect(groupPatch(null, null)).toEqual({});
  });

  it('sends the chosen group', () => {
    expect(groupPatch('g2', 'g1')).toEqual({ groupId: 'g2' });
  });

  it('asks to take the night out of its group', () => {
    expect(groupPatch(null, 'g1')).toEqual({ clearGroup: true });
  });
});
