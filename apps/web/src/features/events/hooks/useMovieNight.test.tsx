import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '@/shared/i18n';
import type { EventData } from '@/shared/types/event';
import type { MovieData } from '@/shared/types/movie';
import { useMovieNight } from '@/features/events/hooks/useMovieNight';
import { useEventDetailPage } from '@/features/events/hooks/useEventDetailPage';
import { useEventMovieVoting } from '@/features/events/pages/event-detail/useEventMovieVoting';
import {
  markMovieAsSeen,
  removeMovieFromEvent,
  setMovieWheelExclusion,
  unmarkMovieAsSeen,
} from '@/features/movies/api/moviesApi';

vi.mock('@/features/events/hooks/useEventDetailPage', () => ({ useEventDetailPage: vi.fn() }));
vi.mock('@/features/events/pages/event-detail/useEventMovieVoting', () => ({
  useEventMovieVoting: vi.fn(),
}));
vi.mock('@/features/movies/api/moviesApi', () => ({
  markMovieAsSeen: vi.fn(),
  unmarkMovieAsSeen: vi.fn(),
  removeMovieFromEvent: vi.fn(),
  setMovieWheelExclusion: vi.fn(),
}));

const film: MovieData = {
  id: 'm1',
  eventId: 'e1',
  participantId: 'p1',
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

const handleVote = vi.fn();
const refreshAll = vi.fn();
const setActionError = vi.fn();

function page(
  overrides: { event?: Partial<EventData>; movies?: MovieData[]; mine?: boolean } = {}
) {
  vi.mocked(useEventDetailPage).mockReturnValue({
    event: { id: 'e1', title: 'Ciné-club', slug: 'Ab3x', isHost: false, ...overrides.event },
    movies: overrides.movies ?? [film],
    participant: overrides.mine === false ? null : { participantId: 'p1', pseudo: 'Alice' },
    hostToken: 'host',
    refreshAll,
    setActionError,
    actionError: null,
    eventQuery: { isSuccess: true },
    moviesQuery: { isSuccess: true },
  } as unknown as ReturnType<typeof useEventDetailPage>);
}

function wrapper({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

function renderNight() {
  return renderHook(() => useMovieNight({ slug: 'Ab3x', tmdbId: 14306, mediaType: 'movie' }), {
    wrapper,
  });
}

describe('useMovieNight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEventMovieVoting).mockReturnValue({
      handleVote,
    } as unknown as ReturnType<typeof useEventMovieVoting>);
  });

  it('finds the film in the night and lets its proposer act on it', () => {
    page();
    const { result } = renderNight();

    expect(result.current.movie?.id).toBe('m1');
    expect(result.current.canAct).toBe(true);
    expect(result.current.canRemove).toBe(true);
    expect(result.current.canToggleWheel).toBe(false);
    expect(result.current.loaded).toBe(true);
  });

  it('gives the host the draw toggle and locks removal once a winner is drawn', () => {
    page({
      event: { isHost: true, winners: [{ movieId: 'm9' }] } as Partial<EventData>,
      mine: true,
    });
    const { result } = renderNight();

    expect(result.current.canToggleWheel).toBe(true);
    expect(result.current.canRemove).toBe(false);
  });

  it('ignores a film of another kind with the same id', () => {
    page({ movies: [{ ...film, mediaType: 'tv' }] });
    const { result } = renderNight();

    expect(result.current.movie).toBeNull();
    expect(result.current.canRemove).toBe(false);
  });

  it('votes through the night voting', () => {
    page();
    const { result } = renderNight();

    act(() => result.current.vote(1));

    expect(handleVote).toHaveBeenCalledWith('m1', 1);
  });

  it('marks and unmarks the film as seen', async () => {
    page();
    const { result, rerender } = renderNight();

    await act(() => result.current.toggleSeen());
    expect(markMovieAsSeen).toHaveBeenCalledWith('Ab3x', 'm1', 'p1');
    expect(refreshAll).toHaveBeenCalled();

    page({ movies: [{ ...film, seenByPseudos: ['Alice'] }] });
    rerender();
    await act(() => result.current.toggleSeen());
    expect(unmarkMovieAsSeen).toHaveBeenCalledWith('Ab3x', 'm1', 'p1');
  });

  it('reports a seen mark that failed', async () => {
    page();
    vi.mocked(markMovieAsSeen).mockRejectedValueOnce(new Error('down'));
    const { result } = renderNight();

    await act(() => result.current.toggleSeen());

    expect(setActionError).toHaveBeenLastCalledWith('down');
  });

  it('excludes the film from the draw with the host token', async () => {
    page({ event: { isHost: true } });
    const { result } = renderNight();

    await act(() => result.current.toggleWheel());

    expect(setMovieWheelExclusion).toHaveBeenCalledWith('Ab3x', 'm1', true, 'host');
  });

  it('reports a draw toggle that failed', async () => {
    page({ event: { isHost: true }, movies: [{ ...film, excludedFromWheel: true }] });
    vi.mocked(setMovieWheelExclusion).mockRejectedValueOnce(new Error('nope'));
    const { result } = renderNight();

    await act(() => result.current.toggleWheel());

    expect(setMovieWheelExclusion).toHaveBeenCalledWith('Ab3x', 'm1', false, 'host');
    expect(setActionError).toHaveBeenLastCalledWith('nope');
  });

  it('removes the film and says whether it worked', async () => {
    page();
    const { result } = renderNight();

    let removed = false;
    await act(async () => {
      removed = await result.current.remove();
    });
    expect(removeMovieFromEvent).toHaveBeenCalledWith('Ab3x', 'm1', 'p1', 'host');
    expect(removed).toBe(true);

    vi.mocked(removeMovieFromEvent).mockRejectedValueOnce(new Error('locked'));
    await act(async () => {
      removed = await result.current.remove();
    });
    expect(removed).toBe(false);
    expect(setActionError).toHaveBeenLastCalledWith('locked');
  });

  it('does nothing for a visitor who is not part of the night', async () => {
    page({ mine: false });
    const { result } = renderNight();

    await act(() => result.current.toggleSeen());
    let removed = true;
    await act(async () => {
      removed = await result.current.remove();
    });

    expect(result.current.canAct).toBe(false);
    expect(markMovieAsSeen).not.toHaveBeenCalled();
    expect(removed).toBe(false);
  });
});
