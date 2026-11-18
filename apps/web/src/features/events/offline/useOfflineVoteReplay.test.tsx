import { act, renderHook, waitFor } from '@testing-library/react';
import { onlineManager } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/apiError';
import { LocaleProvider, t as translate, type Translate } from '@/shared/i18n';
import { queueVote, readQueuedVotes } from '@/shared/utils/offlineEventStorage';
import {
  OFFLINE_VOTE_RETRY_BASE_MS,
  offlineVoteReport,
  useOfflineVoteReplay,
} from '@/features/events/offline/useOfflineVoteReplay';

const t: Translate = (key, params) => translate(key, params, 'fr');

const api = vi.hoisted(() => ({ voteMovie: vi.fn(), clearMovieVote: vi.fn() }));

vi.mock('@/features/events/api/eventMoviesApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/events/api/eventMoviesApi')>()),
  ...api,
}));

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

function queue(movieId: string, value: 1 | -1 | 0, slug = 'cine-club'): void {
  queueVote({ slug, movieId, participantId: 'p-me', value, queuedAt: Date.now() });
}

describe('useOfflineVoteReplay', () => {
  beforeEach(() => {
    api.voteMovie.mockReset().mockResolvedValue(undefined);
    api.clearMovieVote.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    onlineManager.setOnline(true);
  });

  async function flush(ms = 0): Promise<void> {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  it('tries again a little later when the request fails while the browser still says online', async () => {
    vi.useFakeTimers();
    queue('m1', 1);
    api.voteMovie
      .mockRejectedValueOnce(new ApiError('Network down', { code: 0 }))
      .mockResolvedValue(undefined);
    const { result } = renderHook(
      () => useOfflineVoteReplay({ slug: 'cine-club', onReplayed: vi.fn() }),
      { wrapper }
    );
    await flush();
    expect(api.voteMovie).toHaveBeenCalledTimes(1);
    expect(readQueuedVotes('cine-club')).toHaveLength(1);

    await flush(OFFLINE_VOTE_RETRY_BASE_MS);

    expect(api.voteMovie).toHaveBeenCalledTimes(2);
    expect(readQueuedVotes('cine-club')).toEqual([]);
    expect(offlineVoteReport(result.current.outcome, t)?.message).toBe(
      'Votre vote fait hors ligne a été enregistré.'
    );
  });

  it('waits longer after each failed attempt', async () => {
    vi.useFakeTimers();
    queue('m1', 1);
    api.voteMovie.mockRejectedValue(new ApiError('Network down', { code: 0 }));
    renderHook(() => useOfflineVoteReplay({ slug: 'cine-club', onReplayed: vi.fn() }), {
      wrapper,
    });
    await flush();
    await flush(OFFLINE_VOTE_RETRY_BASE_MS);
    expect(api.voteMovie).toHaveBeenCalledTimes(2);

    await flush(OFFLINE_VOTE_RETRY_BASE_MS);
    expect(api.voteMovie).toHaveBeenCalledTimes(2);

    await flush(OFFLINE_VOTE_RETRY_BASE_MS);
    expect(api.voteMovie).toHaveBeenCalledTimes(3);
  });

  it('tries again at once when the server answers again', async () => {
    vi.useFakeTimers();
    queue('m1', 1);
    api.voteMovie
      .mockRejectedValueOnce(new ApiError('Network down', { code: 0 }))
      .mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ serverReachedAt }: { serverReachedAt: number }) =>
        useOfflineVoteReplay({ slug: 'cine-club', onReplayed: vi.fn(), serverReachedAt }),
      { wrapper, initialProps: { serverReachedAt: 1 } }
    );
    await flush();
    expect(api.voteMovie).toHaveBeenCalledTimes(1);

    rerender({ serverReachedAt: 2 });
    await flush();

    expect(api.voteMovie).toHaveBeenCalledTimes(2);
    expect(readQueuedVotes('cine-club')).toEqual([]);
  });

  it('stops trying once unmounted', async () => {
    vi.useFakeTimers();
    queue('m1', 1);
    api.voteMovie.mockRejectedValue(new ApiError('Network down', { code: 0 }));
    const { unmount } = renderHook(
      () => useOfflineVoteReplay({ slug: 'cine-club', onReplayed: vi.fn() }),
      { wrapper }
    );
    await flush();

    unmount();
    await flush(OFFLINE_VOTE_RETRY_BASE_MS * 64);

    expect(api.voteMovie).toHaveBeenCalledTimes(1);
  });

  it('waits for the network before sending anything', () => {
    onlineManager.setOnline(false);
    queue('m1', 1);

    renderHook(() => useOfflineVoteReplay({ slug: 'cine-club', onReplayed: vi.fn() }), { wrapper });

    expect(api.voteMovie).not.toHaveBeenCalled();
    expect(readQueuedVotes('cine-club')).toHaveLength(1);
  });

  it('sends the queued votes once back online, then refreshes and says so', async () => {
    onlineManager.setOnline(false);
    queue('m1', 1);
    queue('m2', 0);
    queue('m9', 1, 'another-night');
    const onReplayed = vi.fn();
    const { result } = renderHook(() => useOfflineVoteReplay({ slug: 'cine-club', onReplayed }), {
      wrapper,
    });

    act(() => onlineManager.setOnline(true));

    await waitFor(() => expect(result.current.outcome).not.toBeNull());
    expect(api.voteMovie).toHaveBeenCalledWith('cine-club', 'm1', 'p-me', 1);
    expect(api.clearMovieVote).toHaveBeenCalledWith('cine-club', 'm2', 'p-me');
    expect(api.voteMovie).toHaveBeenCalledTimes(1);
    expect(readQueuedVotes('cine-club')).toEqual([]);
    expect(readQueuedVotes('another-night')).toHaveLength(1);
    expect(onReplayed).toHaveBeenCalled();
    expect(offlineVoteReport(result.current.outcome, t)).toEqual({
      tone: 'success',
      message: 'Vos 2 votes faits hors ligne ont été enregistrés.',
    });
  });

  it('drops a vote the night refuses, and says why', async () => {
    queue('m1', 1);
    api.voteMovie.mockRejectedValue(
      new ApiError('Soirée terminée. Lecture seule.', { code: 409, reason: 'event_finished' })
    );

    const { result } = renderHook(
      () => useOfflineVoteReplay({ slug: 'cine-club', onReplayed: vi.fn() }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.outcome).not.toBeNull());
    expect(offlineVoteReport(result.current.outcome, t)?.message).toBe(
      "Un vote fait hors ligne n'a pas pu être enregistré : Soirée terminée. Lecture seule."
    );
    expect(offlineVoteReport(result.current.outcome, t)?.tone).toBe('warning');
    expect(readQueuedVotes('cine-club')).toEqual([]);
  });

  it('keeps what is left when the network drops again in the middle', async () => {
    queue('m1', 1);
    queue('m2', -1);
    api.voteMovie
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ApiError('Network down', { code: 0 }));

    const { result } = renderHook(
      () => useOfflineVoteReplay({ slug: 'cine-club', onReplayed: vi.fn() }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.outcome).not.toBeNull());
    expect(readQueuedVotes('cine-club').map((vote) => vote.movieId)).toEqual(['m2']);
    expect(offlineVoteReport(result.current.outcome, t)?.message).toBe(
      'Votre vote fait hors ligne a été enregistré.'
    );
  });

  it('sends the intent a participant changed while the replay was running', async () => {
    queue('m1', 1);
    api.voteMovie.mockImplementationOnce(async () => {
      queue('m1', -1);
    });

    const { result } = renderHook(
      () => useOfflineVoteReplay({ slug: 'cine-club', onReplayed: vi.fn() }),
      { wrapper }
    );

    await waitFor(() => expect(api.voteMovie).toHaveBeenCalledTimes(2));
    expect(api.voteMovie).toHaveBeenLastCalledWith('cine-club', 'm1', 'p-me', -1);
    await waitFor(() => expect(readQueuedVotes('cine-club')).toEqual([]));
    expect(result.current.outcome).not.toBeNull();
  });

  it('lets the reader dismiss the report', async () => {
    queue('m1', 1);
    const { result } = renderHook(
      () => useOfflineVoteReplay({ slug: 'cine-club', onReplayed: vi.fn() }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.outcome).not.toBeNull());

    act(() => result.current.dismiss());

    expect(result.current.outcome).toBeNull();
  });
});
