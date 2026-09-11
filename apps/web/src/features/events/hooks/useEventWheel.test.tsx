import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { useEventWheel } from '@/features/events/hooks/useEventWheel';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';

vi.mock('@/features/events/api/eventsApi', () => ({
  postEventWheel: vi.fn(),
  postEventWinner: vi.fn(),
  deleteEventWheel: vi.fn(),
  deleteEventWinner: vi.fn(),
}));

import { postEventWheel } from '@/features/events/api/eventsApi';

const postEventWheelMock = vi.mocked(postEventWheel);

function movie(id: string): MovieData {
  return {
    id,
    eventId: 'e1',
    participantId: 'p1',
    tmdbId: Number(id.replace(/\D/g, '')) || 1,
    title: `Film ${id}`,
    year: '2020',
    posterPath: null,
    proposerPseudo: 'moi',
    score: 0,
    up: 0,
    down: 0,
  };
}

function buildEvent(winnerCount: number): EventData {
  return {
    id: 'e1',
    slug: 'soiree',
    title: 'Soirée',
    date: '2030-01-01',
    time: '20:00',
    isHost: true,
    isFinished: false,
    winners: [],
    config: {
      theme: null,
      maxProposalsPerParticipant: null,
      maxParticipants: null,
      wheelMode: 'strictRandom',
      winnerCount,
      winnerCountMax: 10,
      drawnWinnerCount: 0,
    },
  };
}

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return <AppTestProviders>{children}</AppTestProviders>;
}

function renderWheel(winnerCount: number, movies: MovieData[]) {
  return renderHook(
    () =>
      useEventWheel({
        slug: 'soiree',
        event: buildEvent(winnerCount),
        movies,
        hostToken: 'tok',
        onWheelDone: vi.fn(),
      }),
    { wrapper }
  );
}

describe('useEventWheel, tirages enchaînés depuis la modale', () => {
  beforeEach(() => {
    postEventWheelMock.mockReset();
  });

  it('retire de la roue le film qui vient de gagner, sans attendre le rafraîchissement', async () => {
    const movies = [movie('m1'), movie('m2'), movie('m3')];
    postEventWheelMock
      .mockResolvedValueOnce({ winner: movies[0]!, message: 'Roue lancée.' })
      .mockResolvedValueOnce({ winner: movies[1]!, message: 'Roue lancée.' });

    const { result } = renderWheel(3, movies);

    act(() => result.current.launch());
    await waitFor(() => expect(result.current.spinPool).toHaveLength(3));

    act(() => result.current.launch());
    await waitFor(() => expect(result.current.spinPool).toHaveLength(2));

    expect(result.current.spinPool.map((m) => m.id)).toEqual(['m2', 'm3']);
  });

  it('décompte les tirages déjà faits et ferme la relance une fois le quota atteint', async () => {
    const movies = [movie('m1'), movie('m2'), movie('m3')];
    postEventWheelMock
      .mockResolvedValueOnce({ winner: movies[0]!, message: 'Roue lancée.' })
      .mockResolvedValueOnce({ winner: movies[1]!, message: 'Roue lancée.' });

    const { result } = renderWheel(2, movies);

    expect(result.current.remainingDraws).toBe(2);

    act(() => result.current.launch());
    await waitFor(() => expect(result.current.remainingDraws).toBe(1));
    expect(result.current.canRelaunchFromModal).toBe(true);

    act(() => result.current.launch());
    await waitFor(() => expect(result.current.remainingDraws).toBe(0));
    expect(result.current.canRelaunchFromModal).toBe(false);
  });
});
