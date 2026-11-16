import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MovieData } from '@/shared/types/movie';
import { queueVote } from '@/shared/utils/offlineEventStorage';
import { applyQueuedVotes, useQueuedVotes } from '@/features/events/offline/queuedVotes';

const movie = (id: string, myVote: 1 | -1 | null, up: number, down: number): MovieData =>
  ({ id, title: id, myVote, up, down, score: up - down }) as MovieData;

describe('applyQueuedVotes', () => {
  it('shows a queued upvote on a movie I had not voted for, marked pending', () => {
    const [shown] = applyQueuedVotes(
      [movie('m1', null, 2, 1)],
      [{ slug: 's', movieId: 'm1', participantId: 'p1', value: 1, queuedAt: 1 }],
      'p1'
    );

    expect(shown).toMatchObject({ myVote: 1, up: 3, down: 1, score: 2, pendingVote: true });
  });

  it('moves my vote from against to for', () => {
    const [shown] = applyQueuedVotes(
      [movie('m1', -1, 2, 1)],
      [{ slug: 's', movieId: 'm1', participantId: 'p1', value: 1, queuedAt: 1 }],
      'p1'
    );

    expect(shown).toMatchObject({ myVote: 1, up: 3, down: 0, score: 3 });
  });

  it('shows a queued withdrawal', () => {
    const [shown] = applyQueuedVotes(
      [movie('m1', 1, 2, 0)],
      [{ slug: 's', movieId: 'm1', participantId: 'p1', value: 0, queuedAt: 1 }],
      'p1'
    );

    expect(shown).toMatchObject({ myVote: null, up: 1, down: 0, score: 1, pendingVote: true });
  });

  it('leaves the movies of another participant and the untouched ones as they are', () => {
    const movies = [movie('m1', null, 0, 0), movie('m2', null, 0, 0)];

    const shown = applyQueuedVotes(
      movies,
      [{ slug: 's', movieId: 'm1', participantId: 'someone-else', value: 1, queuedAt: 1 }],
      'p1'
    );

    expect(shown[0]).toBe(movies[0]);
    expect(shown[1]).toBe(movies[1]);
  });
});

describe('useQueuedVotes', () => {
  it('follows the queue of one movie night', () => {
    const { result } = renderHook(() => useQueuedVotes('s'));
    expect(result.current).toEqual([]);

    act(() => queueVote({ slug: 's', movieId: 'm1', participantId: 'p1', value: 1, queuedAt: 1 }));
    act(() =>
      queueVote({ slug: 'other', movieId: 'm9', participantId: 'p1', value: 1, queuedAt: 2 })
    );

    expect(result.current.map((vote) => vote.movieId)).toEqual(['m1']);
  });
});
