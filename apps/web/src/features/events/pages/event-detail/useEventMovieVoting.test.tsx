import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import { ApiError } from '@/shared/api/apiError';
import type { MovieData } from '@/shared/types/movie';
import { useEventMovieVoting } from '@/features/events/pages/event-detail/useEventMovieVoting';

const api = vi.hoisted(() => ({ voteMovie: vi.fn(), clearMovieVote: vi.fn() }));

vi.mock('@/features/movies/api/moviesApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/movies/api/moviesApi')>()),
  ...api,
}));

vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));

const MOVIE: MovieData = {
  id: 'm1',
  eventId: 'e1',
  participantId: 'p-other',
  tmdbId: 42,
  mediaType: 'movie',
  title: 'Matrix',
  year: '1999',
  posterPath: null,
  proposerPseudo: 'Léa',
  score: 0,
  up: 0,
  down: 0,
  myVote: null,
};

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

function renderVoting() {
  const setActionError = vi.fn();
  const refreshAll = vi.fn();
  const { result } = renderHook(
    () =>
      useEventMovieVoting({
        slug: 'cine-club',
        participant: { participantId: 'p-me', pseudo: 'Sofia' },
        movies: [MOVIE],
        layout: 'grid',
        setActionError,
        refreshAll,
      }),
    { wrapper }
  );
  return { result, setActionError, refreshAll };
}

describe('useEventMovieVoting', () => {
  beforeEach(() => {
    api.voteMovie.mockReset();
    api.clearMovieVote.mockReset();
  });

  it('hands a failed vote back to the caller that waits for it, without the page banner', async () => {
    const failure = new ApiError('La roue a déjà été lancée.', { code: 409 });
    api.voteMovie.mockRejectedValue(failure);
    const { result, setActionError, refreshAll } = renderVoting();

    await act(async () => {
      await expect(result.current.submitVote('m1', 1)).rejects.toBe(failure);
    });

    expect(setActionError).not.toHaveBeenCalledWith(expect.any(String));
    expect(refreshAll).not.toHaveBeenCalled();
  });

  it('resynchronises the list when the vote limit refuses the vote it hands back', async () => {
    api.voteMovie.mockRejectedValue(
      new ApiError('Limite de 2 vote(s) par participant atteinte.', {
        code: 409,
        reason: 'vote-limit-reached',
      })
    );
    const { result, refreshAll } = renderVoting();

    await act(async () => {
      await expect(result.current.submitVote('m1', 1)).rejects.toBeInstanceOf(ApiError);
    });

    expect(refreshAll).toHaveBeenCalled();
    expect(result.current.voteLimitReached).toBe(false);
  });

  it('refreshes the night once the vote it waits for went through', async () => {
    api.voteMovie.mockResolvedValue(undefined);
    const { result, refreshAll } = renderVoting();

    await act(async () => {
      await result.current.submitVote('m1', 1);
    });

    expect(api.voteMovie).toHaveBeenCalledWith('cine-club', 'm1', 'p-me', 1);
    expect(refreshAll).toHaveBeenCalled();
  });
});
