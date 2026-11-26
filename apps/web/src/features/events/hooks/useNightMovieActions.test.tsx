import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '@/shared/i18n';
import type { MovieData } from '@/shared/types/movie';
import {
  markMovieAsSeen,
  setMovieWheelExclusion,
  unmarkMovieAsSeen,
} from '@/features/events/api/eventMoviesApi';
import {
  useNightMovieActions,
  useWheelExclusionToggle,
  type NightMovieActionsInput,
} from '@/features/events/hooks/useNightMovieActions';

vi.mock('@/features/events/api/eventMoviesApi', () => ({
  markMovieAsSeen: vi.fn(),
  unmarkMovieAsSeen: vi.fn(),
  setMovieWheelExclusion: vi.fn(),
}));

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
  seenByPseudos: [],
};

const refresh = vi.fn();
const onError = vi.fn();

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

function render(overrides: Partial<NightMovieActionsInput> = {}) {
  return renderHook(
    () =>
      useNightMovieActions({
        slug: 'Ab3x',
        movie: film,
        isFinished: false,
        isHost: false,
        wheelLocked: false,
        participantId: 'p-alice',
        participantPseudo: 'Alice',
        refresh,
        onError,
        ...overrides,
      }),
    { wrapper }
  );
}

describe('useNightMovieActions', () => {
  beforeEach(() => {
    vi.mocked(markMovieAsSeen).mockReset().mockResolvedValue(undefined);
    vi.mocked(unmarkMovieAsSeen).mockReset().mockResolvedValue(undefined);
    refresh.mockReset();
    onError.mockReset();
  });

  it('exposes the night rules of the movie', () => {
    const { result } = render({ wheelLocked: true });

    expect(result.current).toMatchObject({
      isMine: true,
      canAct: true,
      canRemove: false,
      canEditNote: false,
      canToggleWheel: false,
      iMarkedSeen: false,
    });
  });

  it('grants nothing on a movie that is not in the night, but keeps the participant able to act', () => {
    const { result } = render({ movie: null, isHost: true });

    expect(result.current).toMatchObject({
      isMine: false,
      canAct: true,
      canRemove: false,
      canToggleWheel: false,
    });
  });

  it('marks the movie seen, then refreshes the night', async () => {
    const onActionStart = vi.fn();
    const { result } = render({ onActionStart });

    await act(() => result.current.toggleSeen());

    expect(onActionStart).toHaveBeenCalledTimes(1);
    expect(markMovieAsSeen).toHaveBeenCalledWith('Ab3x', 'm1', 'p-alice');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current.seenPending).toBe(false);
  });

  it('takes the mark back when I already saw it', async () => {
    const { result } = render({ movie: { ...film, seenByPseudos: ['Alice'] } });

    await act(() => result.current.toggleSeen());

    expect(unmarkMovieAsSeen).toHaveBeenCalledWith('Ab3x', 'm1', 'p-alice');
    expect(markMovieAsSeen).not.toHaveBeenCalled();
  });

  it('reports a failure without refreshing', async () => {
    vi.mocked(markMovieAsSeen).mockRejectedValue(new Error('boom'));
    const { result } = render();

    await act(() => result.current.toggleSeen());

    expect(onError).toHaveBeenCalledWith('boom');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('does nothing for a visitor', async () => {
    const { result } = render({ participantId: null, participantPseudo: null });

    await act(() => result.current.toggleSeen());

    expect(markMovieAsSeen).not.toHaveBeenCalled();
    expect(result.current.canAct).toBe(false);
  });

  it('puts the movie out of the draw as the host, then refreshes the night', async () => {
    const onActionStart = vi.fn();
    const { result } = render({ isHost: true, onActionStart });

    await act(() => result.current.toggleWheel());

    expect(onActionStart).toHaveBeenCalledTimes(1);
    expect(setMovieWheelExclusion).toHaveBeenCalledWith('Ab3x', 'm1', true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('useWheelExclusionToggle', () => {
  beforeEach(() => {
    vi.mocked(setMovieWheelExclusion).mockReset().mockResolvedValue(undefined);
    refresh.mockReset();
    onError.mockReset();
  });

  it('brings an excluded movie back into the draw from any row of the night', async () => {
    const { result } = renderHook(
      () => useWheelExclusionToggle({ slug: 'Ab3x', refresh, onError }),
      { wrapper }
    );

    await act(() => result.current({ ...film, excludedFromWheel: true }));

    expect(setMovieWheelExclusion).toHaveBeenCalledWith('Ab3x', 'm1', false);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('says the movie could not be put back in the draw, without refreshing', async () => {
    vi.mocked(setMovieWheelExclusion).mockRejectedValue('offline');
    const { result } = renderHook(
      () => useWheelExclusionToggle({ slug: 'Ab3x', refresh, onError }),
      { wrapper }
    );

    await act(() => result.current({ ...film, excludedFromWheel: true }));

    expect(onError).toHaveBeenCalledWith('Réintégration impossible');
    expect(refresh).not.toHaveBeenCalled();
  });
});
