import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';
import { useEventWheel } from '@/features/events/hooks/useEventWheel';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import { WHEEL_SPIN_DURATION_MS } from '@/shared/utils/wheelSpin';
import {
  deleteEventWinner,
  postEventWheel,
  postEventWheelAnnounce,
  postEventWinner,
} from '@/features/events/api/eventsApi';

vi.mock('@/features/events/api/eventsApi', () => ({
  postEventWheel: vi.fn(),
  postEventWheelAnnounce: vi.fn().mockResolvedValue(undefined),
  postEventWinner: vi.fn(),
  postEventClose: vi.fn(),
  deleteEventWheel: vi.fn(),
  deleteEventWinner: vi.fn(),
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

  it('tells the server how many winners it has seen, so a replayed launch draws nobody new', async () => {
    const { result } = renderHook(
      () =>
        useEventWheel({
          slug: 'soiree',
          event: { ...hostEvent, winners: [{ movieId: 'mov0' }] } as EventData,
          movies: [winner],
          hostToken: 'ht1',
          onWheelDone: () => {},
        }),
      { wrapper }
    );

    act(() => result.current.launch());

    await waitFor(() => expect(postEventWheel).toHaveBeenCalledWith('soiree', 'ht1', 1));
  });

  it('counts its own draw before the next poll, so a relaunch asks for a new film', async () => {
    const second = { id: 'mov2', title: 'Alien', tmdbId: 2 } as MovieData;
    const { result } = renderHook(
      () =>
        useEventWheel({
          slug: 'soiree',
          event: { ...hostEvent, winners: [], config: { winnerCount: 3 } } as unknown as EventData,
          movies: [winner, second],
          hostToken: 'ht1',
          onWheelDone: () => {},
        }),
      { wrapper }
    );

    act(() => result.current.launch());
    await waitFor(() => expect(result.current.spinWinner?.id).toBe('mov1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.launch());

    await waitFor(() => expect(postEventWheel).toHaveBeenLastCalledWith('soiree', 'ht1', 1));
  });

  it('shows a replayed draw as it is instead of spinning onto another film', async () => {
    const { result } = renderHook(
      () =>
        useEventWheel({
          slug: 'soiree',
          event: { ...hostEvent, winners: [], config: { winnerCount: 3 } } as unknown as EventData,
          movies: [{ id: 'mov2', title: 'Alien', tmdbId: 2 } as MovieData],
          hostToken: 'ht1',
          onWheelDone: () => {},
        }),
      { wrapper }
    );

    act(() => result.current.launch());

    await waitFor(() => expect(result.current.spinWinner?.id).toBe('mov1'));
    expect(result.current.spinPool.map((m) => m.id)).toEqual(['mov1']);
    expect(result.current.winnerIndex).toBe(0);
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

  it('announces the winner when the host leaves the page while the wheel is still spinning', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result, unmount } = renderWheel();

    act(() => result.current.launch());
    await vi.waitFor(() => expect(result.current.isModalOpen).toBe(true));
    expect(postEventWheelAnnounce).not.toHaveBeenCalled();

    unmount();
    await vi.advanceTimersByTimeAsync(WHEEL_SPIN_DURATION_MS + 100);

    expect(postEventWheelAnnounce).toHaveBeenCalledTimes(1);
    expect(postEventWheelAnnounce).toHaveBeenCalledWith('soiree', 'ht1');
  });

  it('does not announce again on leaving the page once the winner is out', async () => {
    const { result, unmount } = renderWheel();

    act(() => result.current.launch());
    await waitFor(() => expect(result.current.isModalOpen).toBe(true));
    act(() => result.current.revealWinner());

    unmount();

    expect(postEventWheelAnnounce).toHaveBeenCalledTimes(1);
  });

  it('announces nothing on leaving the page when no wheel was launched', () => {
    const { unmount } = renderWheel();

    unmount();

    expect(postEventWheelAnnounce).not.toHaveBeenCalled();
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

describe('useEventWheel: pending movie night', () => {
  const second = { id: 'mov2', title: 'Alien', tmdbId: 2 } as MovieData;
  const pendingNight = {
    ...hostEvent,
    lifecycle: 'pending',
    winners: [],
    config: { winnerCount: 3 },
  } as unknown as EventData;

  beforeEach(() => {
    vi.mocked(postEventWheel).mockResolvedValue({ winner, message: 'Roue lancée.' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('treats the first draw as the last one, since the server finishes the night on it', async () => {
    const { result } = renderHook(
      () =>
        useEventWheel({
          slug: 'soiree',
          event: pendingNight,
          movies: [winner, second],
          hostToken: 'ht1',
          onWheelDone: () => {},
        }),
      { wrapper }
    );
    expect(result.current.remainingDraws).toBe(1);

    act(() => result.current.launch());
    await waitFor(() => expect(result.current.spinWinner?.id).toBe('mov1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.remainingDraws).toBe(0);
    expect(result.current.winnerCount).toBe(1);
    expect(result.current.canRelaunchFromModal).toBe(false);
  });
});

describe('useEventWheel: winner shown in the modal', () => {
  const netflix = [{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' as const }];
  const listedDune = {
    ...winner,
    watchProviders: netflix,
    tmdbWatchPageUrl: 'https://www.themoviedb.org/movie/1/watch',
  } as MovieData;

  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderWithListedDune() {
    return renderHook(
      () =>
        useEventWheel({
          slug: 'soiree',
          event: hostEvent,
          movies: [listedDune],
          hostToken: 'ht1',
          onWheelDone: () => {},
        }),
      { wrapper }
    );
  }

  it('shows the streaming platforms of the drawn movie, which the draw response leaves out', async () => {
    vi.mocked(postEventWheel).mockResolvedValue({ winner, message: 'Roue lancée.' });
    const { result } = renderWithListedDune();

    act(() => result.current.launch());

    await waitFor(() => expect(result.current.spinWinner?.id).toBe('mov1'));
    expect(result.current.spinWinner?.watchProviders).toEqual(netflix);
    expect(result.current.spinWinner?.tmdbWatchPageUrl).toBe(
      'https://www.themoviedb.org/movie/1/watch'
    );
  });

  it('shows the streaming platforms of a movie picked by hand', async () => {
    vi.mocked(postEventWinner).mockResolvedValue({ winner, message: 'Film choisi.' });
    const { result } = renderWithListedDune();

    act(() => result.current.pickWinnerManually(listedDune));

    await waitFor(() => expect(result.current.spinWinner?.id).toBe('mov1'));
    expect(result.current.spinWinner?.watchProviders).toEqual(netflix);
    expect(result.current.spinPool[0]?.watchProviders).toEqual(netflix);
  });
});

describe('useEventWheel: taking a winner out', () => {
  const drawn = {
    ...hostEvent,
    winners: [{ movieId: 'mov1', pickMethod: 'wheel', pickedAt: '2030-06-01T20:00:00Z' }],
  } as EventData;

  beforeEach(() => {
    vi.mocked(deleteEventWinner).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('leaves the removal mode once the winner is out', async () => {
    const { result } = renderHook(
      () =>
        useEventWheel({
          slug: 'soiree',
          event: drawn,
          movies: [winner],
          hostToken: 'ht1',
          onWheelDone: () => {},
        }),
      { wrapper }
    );

    act(() => result.current.enterRemovalMode());
    expect(result.current.removalMode).toBe(true);

    act(() => result.current.removeWinner(winner));

    await waitFor(() => expect(result.current.removalMode).toBe(false));
    expect(deleteEventWinner).toHaveBeenCalledWith('soiree', 'mov1', 'ht1');
    expect(result.current.canSpin).toBe(true);
  });
});
