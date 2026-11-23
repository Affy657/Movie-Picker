import { useMemo, useSyncExternalStore } from 'react';
import type { QueuedVote } from '@/shared/utils/offlineEventStorage';

export type SendingVote = Omit<QueuedVote, 'queuedAt'>;

type SendingVoteTarget = Pick<SendingVote, 'slug' | 'movieId' | 'participantId'>;

const NOTHING_SENDING: readonly SendingVote[] = [];

let sending: readonly SendingVote[] = NOTHING_SENDING;

const listeners = new Set<() => void>();

function sameTarget(a: SendingVoteTarget, b: SendingVoteTarget): boolean {
  return a.slug === b.slug && a.movieId === b.movieId && a.participantId === b.participantId;
}

function publish(next: readonly SendingVote[]): void {
  sending = next.length === 0 ? NOTHING_SENDING : next;
  for (const listener of listeners) listener();
}

export function isVoteSending(target: SendingVoteTarget): boolean {
  return sending.some((vote) => sameTarget(vote, target));
}

export function markVoteSending(vote: SendingVote): void {
  publish([...sending.filter((other) => !sameTarget(other, vote)), vote]);
}

export function clearVoteSending(target: SendingVoteTarget): void {
  if (!isVoteSending(target)) return;
  publish(sending.filter((vote) => !sameTarget(vote, target)));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readSending(): readonly SendingVote[] {
  return sending;
}

function readNothing(): readonly SendingVote[] {
  return NOTHING_SENDING;
}

export function useSendingVotes(slug: string | undefined): readonly SendingVote[] {
  const all = useSyncExternalStore(subscribe, readSending, readNothing);
  return useMemo(() => all.filter((vote) => vote.slug === slug), [all, slug]);
}
