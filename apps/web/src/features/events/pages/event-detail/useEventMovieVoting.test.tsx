import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { onlineManager } from '@tanstack/react-query';
import { queueVote, readQueuedVotes } from '@/shared/utils/offlineEventStorage';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { LocaleProvider } from '@/shared/i18n';
import { ApiError } from '@/shared/api/apiError';
import type { MovieData } from '@/shared/types/movie';
import { useEventMovieVoting } from '@/features/events/pages/event-detail/useEventMovieVoting';
import { clearVoteSending, useSendingVotes } from '@/features/events/offline/sendingVotes';

const api = vi.hoisted(() => ({ voteMovie: vi.fn(), clearMovieVote: vi.fn() }));

vi.mock('@/features/events/api/eventMoviesApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/events/api/eventMoviesApi')>()),
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
  return (
    <QueryClientWrapper>
      <LocaleProvider>{children}</LocaleProvider>
    </QueryClientWrapper>
  );
}

function renderVoting(movies: MovieData[] = [MOVIE]) {
  const setActionError = vi.fn();
  const refreshAll = vi.fn();
  const { result } = renderHook(
    () =>
      useEventMovieVoting({
        slug: 'cine-club',
        participant: { participantId: 'p-me', pseudo: 'Sofia' },
        movies,
        layout: 'grid',
        setActionError,
        refreshAll,
      }),
    { wrapper }
  );
  return { result, setActionError, refreshAll };
}

function renderVotingWithSendingVotes(movies: MovieData[] = [MOVIE]) {
  const setActionError = vi.fn();
  const refreshAll = vi.fn();
  const { result } = renderHook(
    () => ({
      voting: useEventMovieVoting({
        slug: 'cine-club',
        participant: { participantId: 'p-me', pseudo: 'Sofia' },
        movies,
        layout: 'grid',
        setActionError,
        refreshAll,
      }),
      sending: useSendingVotes('cine-club'),
    }),
    { wrapper }
  );
  return { result, setActionError, refreshAll };
}

function deferred() {
  let settle: { resolve: () => void; reject: (error: unknown) => void } = {
    resolve: () => undefined,
    reject: () => undefined,
  };
  const promise = new Promise<void>((resolve, reject) => {
    settle = { resolve, reject };
  });
  return { promise, ...settle };
}

describe('useEventMovieVoting', () => {
  beforeEach(() => {
    api.voteMovie.mockReset();
    api.clearMovieVote.mockReset();
  });

  afterEach(() => {
    onlineManager.setOnline(true);
    clearVoteSending({ slug: 'cine-club', movieId: 'm1', participantId: 'p-me' });
  });

  it('queues a vote cast offline instead of calling the API', async () => {
    onlineManager.setOnline(false);
    const { result, setActionError } = renderVoting();

    await act(async () => {
      await result.current.handleVote('m1', 1);
    });

    expect(api.voteMovie).not.toHaveBeenCalled();
    expect(setActionError).not.toHaveBeenCalledWith(expect.any(String));
    expect(readQueuedVotes('cine-club')).toEqual([
      expect.objectContaining({ movieId: 'm1', participantId: 'p-me', value: 1 }),
    ]);
  });

  it('queues the withdrawal of a vote already shown, offline', async () => {
    onlineManager.setOnline(false);
    const { result } = renderVoting([{ ...MOVIE, myVote: -1 }]);

    await act(async () => {
      await result.current.handleVote('m1', -1);
    });

    expect(readQueuedVotes('cine-club')).toEqual([expect.objectContaining({ value: 0 })]);
  });

  it('sends a vote behind the one still waiting for the same movie, never before it', async () => {
    queueVote({ slug: 'cine-club', movieId: 'm1', participantId: 'p-me', value: 1, queuedAt: 1 });
    const { result } = renderVoting([{ ...MOVIE, myVote: 1, pendingVote: true }]);

    await act(async () => {
      await result.current.handleVote('m1', -1);
    });

    expect(api.voteMovie).not.toHaveBeenCalled();
    expect(api.clearMovieVote).not.toHaveBeenCalled();
    expect(readQueuedVotes('cine-club')).toEqual([expect.objectContaining({ value: -1 })]);
  });

  it('keeps a waiting vote tapped again, and queues it anew instead of withdrawing it', async () => {
    queueVote({ slug: 'cine-club', movieId: 'm1', participantId: 'p-me', value: 1, queuedAt: 1 });
    const { result } = renderVoting([{ ...MOVIE, myVote: 1, pendingVote: true }]);

    await act(async () => {
      await result.current.handleVote('m1', 1);
    });

    expect(api.voteMovie).not.toHaveBeenCalled();
    expect(api.clearMovieVote).not.toHaveBeenCalled();
    const [requeued] = readQueuedVotes('cine-club');
    expect(requeued).toEqual(expect.objectContaining({ value: 1 }));
    expect(requeued?.queuedAt).toBeGreaterThan(1);
  });

  it('keeps a waiting vote tapped again while offline', async () => {
    onlineManager.setOnline(false);
    queueVote({ slug: 'cine-club', movieId: 'm1', participantId: 'p-me', value: -1, queuedAt: 1 });
    const { result } = renderVoting([{ ...MOVIE, myVote: -1, pendingVote: true }]);

    await act(async () => {
      await result.current.handleVote('m1', -1);
    });

    expect(readQueuedVotes('cine-club')).toEqual([expect.objectContaining({ value: -1 })]);
  });

  it('queues a vote whose request never reached the server', async () => {
    api.voteMovie.mockRejectedValue(new ApiError('Network down', { code: 0 }));
    const { result, setActionError } = renderVoting();

    await act(async () => {
      await result.current.handleVote('m1', 1);
    });

    expect(setActionError).not.toHaveBeenCalledWith(expect.any(String));
    expect(readQueuedVotes('cine-club')).toEqual([expect.objectContaining({ value: 1 })]);
  });

  it('still reports a vote the server refused, without queueing it', async () => {
    api.voteMovie.mockRejectedValue(new ApiError('Soirée terminée', { code: 409 }));
    const { result, setActionError } = renderVoting();

    await act(async () => {
      await result.current.handleVote('m1', 1);
    });

    expect(setActionError).toHaveBeenCalledWith('Soirée terminée');
    expect(readQueuedVotes('cine-club')).toEqual([]);
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

  it('shows the vote as cast while the server has not answered yet', async () => {
    const answer = deferred();
    api.voteMovie.mockReturnValue(answer.promise);
    const { result } = renderVotingWithSendingVotes();

    let voting: Promise<void> = Promise.resolve();
    act(() => {
      voting = result.current.voting.handleVote('m1', 1);
    });

    expect(result.current.sending).toEqual([
      expect.objectContaining({ movieId: 'm1', participantId: 'p-me', value: 1 }),
    ]);

    await act(async () => {
      answer.resolve();
      await voting;
    });
    expect(result.current.sending).toEqual([]);
  });

  it('shows the withdrawal of a vote at once', () => {
    api.clearMovieVote.mockReturnValue(new Promise(() => undefined));
    const { result } = renderVotingWithSendingVotes([{ ...MOVIE, myVote: 1, up: 1, score: 1 }]);

    act(() => {
      void result.current.voting.handleVote('m1', 1);
    });

    expect(result.current.sending).toEqual([expect.objectContaining({ movieId: 'm1', value: 0 })]);
  });

  it('sends a single vote when tapped again before the server answered', async () => {
    const answer = deferred();
    api.voteMovie.mockReturnValue(answer.promise);
    const { result } = renderVotingWithSendingVotes();

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.voting.handleVote('m1', 1);
    });
    await act(async () => {
      await result.current.voting.handleVote('m1', 1);
      await result.current.voting.handleVote('m1', -1);
    });

    expect(api.voteMovie).toHaveBeenCalledTimes(1);
    expect(api.clearMovieVote).not.toHaveBeenCalled();
    expect(result.current.sending).toEqual([expect.objectContaining({ value: 1 })]);

    await act(async () => {
      answer.resolve();
      await first;
    });
  });

  it('puts the vote back as it was, with a message, when the server refuses it', async () => {
    const answer = deferred();
    api.voteMovie.mockReturnValue(answer.promise);
    const { result, setActionError } = renderVotingWithSendingVotes();

    let voting: Promise<void> = Promise.resolve();
    act(() => {
      voting = result.current.voting.handleVote('m1', 1);
    });
    await act(async () => {
      answer.reject(new ApiError('Erreur serveur', { code: 500 }));
      await voting;
    });

    expect(result.current.sending).toEqual([]);
    expect(setActionError).toHaveBeenLastCalledWith('Erreur serveur');
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
