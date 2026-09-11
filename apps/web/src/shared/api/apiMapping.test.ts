import { describe, expect, it } from 'vitest';

import {
  mapEventData,
  mapMovieData,
  mapParticipantData,
  type RawEventData,
  type RawMovieData,
  type RawParticipantData,
} from '@/shared/api/apiMapping';

describe('mapMovieData', () => {
  it('maps _id to id and keeps a string participantId', () => {
    const res = mapMovieData({
      _id: 'm1',
      participantId: 'p1',
      title: 'A',
    } as unknown as RawMovieData);

    expect(res.id).toBe('m1');
    expect(res.participantId).toBe('p1');
    expect(res.title).toBe('A');
  });

  it('normalises an object participantId to { id, pseudo }', () => {
    const res = mapMovieData({
      _id: 'm1',
      participantId: { _id: 'p1', pseudo: 'Bob' },
    } as unknown as RawMovieData);

    expect(res.participantId).toEqual({ id: 'p1', pseudo: 'Bob' });
  });
});

describe('mapParticipantData', () => {
  it('maps _id to id and keeps the rest', () => {
    const res = mapParticipantData({ _id: 'p1', pseudo: 'Bob' } as unknown as RawParticipantData);

    expect(res.id).toBe('p1');
    expect(res.pseudo).toBe('Bob');
  });
});

describe('mapEventData', () => {
  const base = { _id: 'e1', title: 'Soirée' } as unknown as RawEventData;

  it('applies defaults for absent optional fields', () => {
    const res = mapEventData(base);

    expect(res.id).toBe('e1');
    expect(res.isFinished).toBe(false);
    expect(res.myParticipant).toBeUndefined();
    expect(res.winners).toEqual([]);
    expect(res.participants).toBeUndefined();
  });

  it('maps nested participant, winner and participant list', () => {
    const res = mapEventData({
      _id: 'e1',
      isFinished: true,
      myParticipant: { _id: 'p1', pseudo: 'Bob' },
      winners: [
        {
          movieId: 'm1',
          pickMethod: 'wheel',
          pickedAt: '2030-01-01T20:00:00Z',
          movie: { _id: 'm1', participantId: 'p1', title: 'A' },
        },
      ],
      participants: [{ _id: 'p1', pseudo: 'Bob' }],
    } as unknown as RawEventData);

    expect(res.isFinished).toBe(true);
    expect(res.myParticipant).toEqual({ id: 'p1', pseudo: 'Bob' });
    expect(res.winners?.[0]?.movie?.id).toBe('m1');
    expect(res.participants).toEqual([
      { id: 'p1', pseudo: 'Bob', isCreator: false, avatarId: undefined, handle: null },
    ]);
  });
});
