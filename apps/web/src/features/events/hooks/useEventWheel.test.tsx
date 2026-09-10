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
        onCloseDone: () => {},
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

  it('annonce le gagnant quand la roue s’arrête', async () => {
    const { result } = renderWheel();

    act(() => result.current.launch());
    await waitFor(() => expect(postEventWheel).toHaveBeenCalledTimes(1));

    act(() => result.current.revealWinner());

    await waitFor(() => expect(postEventWheelAnnounce).toHaveBeenCalledWith('soiree', 'ht1'));
  });

  it('annonce une seule fois, même si la révélation et le repli se cumulent', async () => {
    const { result } = renderWheel();

    act(() => result.current.launch());
    await waitFor(() => expect(postEventWheel).toHaveBeenCalledTimes(1));

    act(() => result.current.revealWinner());
    act(() => result.current.dismissModal());

    await waitFor(() => expect(postEventWheelAnnounce).toHaveBeenCalledTimes(1));
  });

  it('annonce quand même si l’animation ne rend jamais la main', async () => {
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
