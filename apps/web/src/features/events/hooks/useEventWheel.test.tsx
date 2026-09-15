import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';
import { useEventWheel } from '@/features/events/hooks/useEventWheel';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import { WHEEL_SPIN_DURATION_MS } from '@/shared/utils/wheelSpin';
import { postEventWheel, postEventWheelAnnounce } from '@/features/events/api/eventsApi';

vi.mock('@/features/events/api/eventsApi', () => ({
  postEventWheel: vi.fn(),
  postEventWheelAnnounce: vi.fn().mockResolvedValue(undefined),
  postEventWinner: vi.fn(),
  postEventClose: vi.fn(),
  deleteEventWheel: vi.fn(),
}));

const winner = { id: 'mov1', title: 'Dune', tmdbId: 1 } as MovieData;

const hostEvent = {
  isHost: true,
  isFinished: false,
  date: '2030-06-01',
  time: '20:00',
} as EventData;

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return createElement(LocaleProvider, null, createElement(ConsentProvider, null, children));
}

function renderWheel() {
  return renderHook(
    () =>
      useEventWheel({
        slug: 'soiree',
        event: hostEvent,
        movies: [winner],
        hostToken: 'ht1',
        onWheelDone: () => {},
      }),
    { wrapper }
  );
}

describe('useEventWheel : annonce du gagnant', () => {
  beforeEach(() => {
    vi.mocked(postEventWheel).mockResolvedValue({ winner, message: 'Roue lancée.' });
    vi.mocked(postEventWheelAnnounce).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("n'annonce rien tant que la roue tourne", async () => {
    const { result } = renderWheel();

    act(() => result.current.launch());
    await waitFor(() => expect(postEventWheel).toHaveBeenCalledTimes(1));

    expect(postEventWheelAnnounce).not.toHaveBeenCalled();
  });

  it('announces the winner when the wheel stops', async () => {
    const { result } = renderWheel();

    act(() => result.current.launch());
    await waitFor(() => expect(postEventWheel).toHaveBeenCalledTimes(1));

    act(() => result.current.revealWinner());

    await waitFor(() => expect(postEventWheelAnnounce).toHaveBeenCalledWith('soiree', 'ht1'));
  });

  it('announces only once, even when the reveal and the fallback add up', async () => {
    const { result } = renderWheel();

    act(() => result.current.launch());
    await waitFor(() => expect(postEventWheel).toHaveBeenCalledTimes(1));

    act(() => result.current.revealWinner());
    act(() => result.current.dismissModal());

    await waitFor(() => expect(postEventWheelAnnounce).toHaveBeenCalledTimes(1));
  });

  it('announces anyway when the animation never yields', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderWheel();

    act(() => result.current.launch());
    await vi.waitFor(() => expect(postEventWheel).toHaveBeenCalledTimes(1));

    expect(postEventWheelAnnounce).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WHEEL_SPIN_DURATION_MS + 100);
    });

    expect(postEventWheelAnnounce).toHaveBeenCalledTimes(1);
  });
});

describe('useEventWheel: remaining slots', () => {
  const second = { id: 'mov2', title: 'Alien', tmdbId: 2 } as MovieData;
  const twoSlots = {
    ...hostEvent,
    config: { winnerCount: 2 },
  } as EventData;

  beforeEach(() => {
    vi.mocked(postEventWheel).mockResolvedValue({ winner, message: 'Roue lancée.' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderWithEvent(initial: EventData) {
    return renderHook(
      ({ event }: { event: EventData }) =>
        useEventWheel({
          slug: 'soiree',
          event,
          movies: [winner, second],
          hostToken: 'ht1',
          onWheelDone: () => {},
        }),
      { wrapper, initialProps: { event: initial } }
    );
  }

  it("reserves the drawn movie's slot while waiting for the refresh", async () => {
    const { result } = renderWithEvent(twoSlots);

    act(() => result.current.launch());
    await waitFor(() => expect(result.current.remainingDraws).toBe(1));

    expect(result.current.drawableMovies.map((m) => m.id)).toEqual(['mov2']);
  });

  it('frees the slot as soon as the server no longer counts this movie among the winners', async () => {
    const { result, rerender } = renderWithEvent(twoSlots);

    act(() => result.current.launch());
    await waitFor(() => expect(result.current.remainingDraws).toBe(1));

    rerender({
      event: {
        ...twoSlots,
        winners: [{ movieId: 'mov1', pickMethod: 'wheel', pickedAt: '2030-06-01T20:00:00Z' }],
      } as EventData,
    });
    await waitFor(() => expect(result.current.remainingDraws).toBe(1));

    rerender({ event: { ...twoSlots, winners: [] } as EventData });

    await waitFor(() => expect(result.current.remainingDraws).toBe(2));
    expect(result.current.drawableMovies.map((m) => m.id)).toEqual(['mov1', 'mov2']);
  });
});
