import { useMemo, useSyncExternalStore } from 'react';
import type { MovieData } from '@/shared/types/movie';
import {
  readQueuedVotes,
  subscribeQueuedVotes,
  type QueuedVote,
} from '@/shared/utils/offlineEventStorage';
import type { SendingVote } from '@/features/events/offline/sendingVotes';

function tally(vote: number | null | undefined, side: 1 | -1): number {
  return vote === side ? 1 : 0;
}

export function applyQueuedVotes(
  movies: MovieData[],
  queued: readonly (QueuedVote | SendingVote)[],
  participantId: string | null
): MovieData[] {
  if (!participantId || queued.length === 0) return movies;
  const intents = new Map(
    queued
      .filter((vote) => vote.participantId === participantId)
      .map((vote) => [vote.movieId, vote.value])
  );
  if (intents.size === 0) return movies;
  return movies.map((movie) => {
    const intent = intents.get(movie.id);
    if (intent === undefined) return movie;
    const before = movie.myVote ?? 0;
    const up = movie.up - tally(before, 1) + tally(intent, 1);
    const down = movie.down - tally(before, -1) + tally(intent, -1);
    return {
      ...movie,
      myVote: intent === 0 ? null : intent,
      up,
      down,
      score: movie.score + intent - before,
      pendingVote: true,
    };
  });
}

export function useQueuedVotes(slug: string | undefined): QueuedVote[] {
  const serialized = useSyncExternalStore(
    subscribeQueuedVotes,
    () => (slug ? JSON.stringify(readQueuedVotes(slug)) : '[]'),
    () => '[]'
  );
  return useMemo(() => JSON.parse(serialized) as QueuedVote[], [serialized]);
}
