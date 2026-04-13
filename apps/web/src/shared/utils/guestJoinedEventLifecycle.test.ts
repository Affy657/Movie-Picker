import { describe, it, expect } from 'vitest';
import type { MovieData } from '@/shared/types/movie';
import { guestJoinedEventLifecycle } from '@/shared/utils/guestJoinedEventLifecycle';
import { parseEventLocalStartMs } from '@/shared/utils/eventScheduleLocal';

const minimalWinner = { id: 'm' } as unknown as MovieData;

describe('guestJoinedEventLifecycle', () => {
  it('retourne finished si isFinished ou gagnant', () => {
    expect(
      guestJoinedEventLifecycle(
        { date: '2030-01-01', time: '12:00', isFinished: true, winnerMovie: null },
        Date.UTC(2025, 0, 1)
      )
    ).toBe('finished');
    expect(
      guestJoinedEventLifecycle(
        {
          date: '2030-01-01',
          time: '12:00',
          isFinished: false,
          winnerMovie: minimalWinner,
        },
        Date.UTC(2025, 0, 1)
      )
    ).toBe('finished');
  });

  it('retourne upcoming avant l’horaire local affiché (aligné parseEventLocalStartMs)', () => {
    const start = parseEventLocalStartMs('2030-06-15', '20:00')!;
    expect(
      guestJoinedEventLifecycle(
        { date: '2030-06-15', time: '20:00', isFinished: false, winnerMovie: null },
        start - 60_000
      )
    ).toBe('upcoming');
  });

  it('retourne live après l’horaire local affiché', () => {
    const start = parseEventLocalStartMs('2030-06-15', '20:00')!;
    expect(
      guestJoinedEventLifecycle(
        { date: '2030-06-15', time: '20:00', isFinished: false, winnerMovie: null },
        start + 60_000
      )
    ).toBe('live');
  });
});
