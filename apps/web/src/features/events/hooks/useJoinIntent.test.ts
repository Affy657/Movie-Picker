import { describe, expect, it } from 'vitest';
import type { EventData } from '@/features/events/types';
import { joinIntentStep } from './useJoinIntent';

const NIGHT: EventData = {
  id: 'evt',
  slug: 'soiree',
  title: 'Soirée horreur',
  date: '2030-12-15',
  time: '21:00',
  participantCount: 2,
  config: {
    theme: null,
    maxProposalsPerParticipant: null,
    maxParticipants: null,
    wheelMode: 'strictRandom',
    winnerCount: 1,
  },
};

const READY = {
  slug: 'soiree',
  event: NIGHT,
  authLoading: false,
  signedIn: true,
  alreadyParticipant: false,
  eventSettled: true,
  offline: false,
};

describe('joinIntentStep', () => {
  it('joins a signed-in account that does not take part yet', () => {
    expect(joinIntentStep(READY)).toBe('join');
  });

  it.each([
    ['the session is still being checked', { authLoading: true }],
    ['the night is still being refreshed', { eventSettled: false }],
    ['the device is offline', { offline: true }],
    ['the night is not loaded yet', { event: null }],
    ['another night is still on screen', { event: { ...NIGHT, slug: 'autre' } }],
    ['the address names no valid night', { slug: undefined }],
  ])('waits while %s', (_case, change) => {
    expect(joinIntentStep({ ...READY, ...change })).toBe('wait');
  });

  it.each([
    ['nobody is signed in', { signedIn: false }],
    ['the account already takes part', { alreadyParticipant: true }],
    [
      'the night already counts the account',
      { event: { ...NIGHT, myParticipant: { id: 'p1', pseudo: 'Bob' } } },
    ],
    ['the night is over', { event: { ...NIGHT, isFinished: true } }],
    [
      'the night is full',
      {
        event: {
          ...NIGHT,
          participantCount: 4,
          config: { ...NIGHT.config!, maxParticipants: 4 },
        },
      },
    ],
  ])('gives up when %s', (_case, change) => {
    expect(joinIntentStep({ ...READY, ...change })).toBe('drop');
  });
});
