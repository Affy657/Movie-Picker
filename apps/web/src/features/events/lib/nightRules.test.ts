import { describe, expect, it } from 'vitest';
import type { MovieData } from '@/shared/types/movie';
import {
  canAct,
  canEditNote,
  canRemove,
  canToggleWheel,
  iMarkedSeen,
  isMine,
  isNightHost,
  isWheelLocked,
  nightMovieRules,
  wheelExclusionErrorKey,
  type NightState,
  type NightViewer,
} from './nightRules';

const film: MovieData = {
  id: 'm1',
  eventId: 'e1',
  participantId: 'p-alice',
  tmdbId: 14306,
  title: 'Marley & moi',
  year: '2008',
  posterPath: null,
  proposerPseudo: 'Alice',
  score: 0,
  up: 0,
  down: 0,
  seenByPseudos: ['Bob'],
};

const open: NightState = { isFinished: false, isHost: false, wheelLocked: false };
const proposer: NightViewer = { participantId: 'p-alice', pseudo: 'Alice' };
const guest: NightViewer = { participantId: 'p-bob', pseudo: 'Bob' };
const visitor: NightViewer = { participantId: null, pseudo: null };

describe('isWheelLocked', () => {
  it('stays open while nothing has been drawn', () => {
    expect(isWheelLocked([])).toBe(false);
    expect(isWheelLocked([], [])).toBe(false);
  });

  it('locks as soon as the night has a winner, as the API does', () => {
    expect(isWheelLocked(['m1'])).toBe(true);
  });

  it('locks on a draw the server accepted but the night has not been read again since', () => {
    expect(isWheelLocked([], ['m1'])).toBe(true);
  });
});

describe('isMine', () => {
  it('matches the proposer by participant id', () => {
    expect(isMine(film, proposer)).toBe(true);
    expect(isMine(film, guest)).toBe(false);
  });

  it('never belongs to someone who has not joined', () => {
    expect(isMine(film, visitor)).toBe(false);
  });
});

describe('canAct', () => {
  it('lets a participant act until the night is over', () => {
    expect(canAct(open, guest)).toBe(true);
    expect(canAct({ ...open, isFinished: true }, guest)).toBe(false);
  });

  it('keeps a visitor out', () => {
    expect(canAct(open, visitor)).toBe(false);
  });
});

describe('canRemove', () => {
  it('lets the proposer and the host take a movie back', () => {
    expect(canRemove(film, open, proposer)).toBe(true);
    expect(canRemove(film, { ...open, isHost: true }, guest)).toBe(true);
    expect(canRemove(film, { ...open, isHost: true }, visitor)).toBe(true);
  });

  it('refuses everyone else', () => {
    expect(canRemove(film, open, guest)).toBe(false);
  });

  it('refuses everyone once the wheel is locked or the night is over', () => {
    const host = { ...open, isHost: true };
    expect(canRemove(film, { ...host, wheelLocked: true }, proposer)).toBe(false);
    expect(canRemove(film, { ...host, isFinished: true }, proposer)).toBe(false);
  });
});

describe('canEditNote', () => {
  it('is the proposer’s, while the wheel is open', () => {
    expect(canEditNote(film, open, proposer)).toBe(true);
    expect(canEditNote(film, { ...open, wheelLocked: true }, proposer)).toBe(false);
    expect(canEditNote(film, { ...open, isFinished: true }, proposer)).toBe(false);
  });

  it('is not the host’s', () => {
    expect(canEditNote(film, { ...open, isHost: true }, guest)).toBe(false);
  });
});

describe('canToggleWheel', () => {
  it('is the host’s until the night is over, winner or not', () => {
    expect(canToggleWheel({ ...open, isHost: true })).toBe(true);
    expect(canToggleWheel({ ...open, isHost: true, wheelLocked: true })).toBe(true);
    expect(canToggleWheel({ ...open, isHost: true, isFinished: true })).toBe(false);
    expect(canToggleWheel(open)).toBe(false);
  });
});

describe('iMarkedSeen', () => {
  it('reads my pseudo among those who saw the movie', () => {
    expect(iMarkedSeen(film, guest)).toBe(true);
    expect(iMarkedSeen(film, proposer)).toBe(false);
    expect(iMarkedSeen({ ...film, seenByPseudos: undefined }, guest)).toBe(false);
  });

  it('is false for a visitor', () => {
    expect(iMarkedSeen(film, visitor)).toBe(false);
  });
});

describe('nightMovieRules', () => {
  it('gathers every rule for one movie', () => {
    expect(nightMovieRules(film, { ...open, isHost: true }, guest)).toEqual({
      isMine: false,
      canAct: true,
      canRemove: true,
      canEditNote: false,
      canToggleWheel: true,
      iMarkedSeen: true,
    });
  });
});

describe('wheelExclusionErrorKey', () => {
  it('names the action that failed', () => {
    expect(wheelExclusionErrorKey(true)).toBe('movies.list.excludeFromWheelError');
    expect(wheelExclusionErrorKey(false)).toBe('movies.list.includeInWheelError');
  });
});

describe('isNightHost', () => {
  it('follows the isHost the API serves, and says no when it is missing', () => {
    expect(isNightHost({ isHost: true })).toBe(true);
    expect(isNightHost({ isHost: false })).toBe(false);
    expect(isNightHost({})).toBe(false);
    expect(isNightHost(undefined)).toBe(false);
  });
});
