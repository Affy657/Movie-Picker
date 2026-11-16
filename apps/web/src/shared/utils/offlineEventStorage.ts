import type { EventData } from '@/shared/types/event';
import type { MovieData } from '@/shared/types/movie';

export type LastEventSnapshot = {
  slug: string;
  savedAt: number;
  event: EventData;
  movies: MovieData[];
};

export type QueuedVoteValue = 1 | -1 | 0;

export type QueuedVote = {
  slug: string;
  movieId: string;
  participantId: string;
  value: QueuedVoteValue;
  queuedAt: number;
};

type QueuedVoteTarget = Pick<QueuedVote, 'slug' | 'movieId' | 'participantId'>;

const SNAPSHOT_KEY = 'mp.offline-last-event';
const VOTE_QUEUE_KEY = 'mp.offline-votes';

const queueListeners = new Set<() => void>();

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    return;
  }
}

export function saveLastEventSnapshot(snapshot: LastEventSnapshot): void {
  writeJson(SNAPSHOT_KEY, snapshot);
}

export function readLastEventSnapshot(slug: string): LastEventSnapshot | null {
  const stored = readJson(SNAPSHOT_KEY) as LastEventSnapshot | null;
  if (stored?.slug !== slug || !stored.event || !Array.isArray(stored.movies)) return null;
  return stored;
}

export function forgetLastEventSnapshot(slug: string): void {
  if (readLastEventSnapshot(slug)) remove(SNAPSHOT_KEY);
}

function isQueuedVote(value: unknown): value is QueuedVote {
  if (!value || typeof value !== 'object') return false;
  const vote = value as Partial<QueuedVote>;
  return (
    typeof vote.slug === 'string' &&
    typeof vote.movieId === 'string' &&
    typeof vote.participantId === 'string' &&
    (vote.value === 1 || vote.value === -1 || vote.value === 0)
  );
}

function readQueue(): QueuedVote[] {
  const stored = readJson(VOTE_QUEUE_KEY);
  return Array.isArray(stored) ? stored.filter(isQueuedVote) : [];
}

function sameTarget(a: QueuedVoteTarget, b: QueuedVoteTarget): boolean {
  return a.slug === b.slug && a.movieId === b.movieId && a.participantId === b.participantId;
}

function writeQueue(queue: QueuedVote[]): void {
  if (queue.length === 0) remove(VOTE_QUEUE_KEY);
  else writeJson(VOTE_QUEUE_KEY, queue);
  for (const listener of queueListeners) listener();
}

export function queueVote(vote: QueuedVote): void {
  const queue = readQueue();
  const index = queue.findIndex((queued) => sameTarget(queued, vote));
  if (index >= 0) queue[index] = vote;
  else queue.push(vote);
  writeQueue(queue);
}

export function readQueuedVotes(slug?: string): QueuedVote[] {
  const queue = readQueue();
  return slug === undefined ? queue : queue.filter((vote) => vote.slug === slug);
}

export function removeQueuedVote(sent: QueuedVote): void {
  writeQueue(
    readQueue().filter((queued) => !(sameTarget(queued, sent) && queued.queuedAt === sent.queuedAt))
  );
}

export function hasQueuedVote(target: QueuedVoteTarget): boolean {
  return readQueue().some((queued) => sameTarget(queued, target));
}

export function latestQueuedVote(target: QueuedVoteTarget): QueuedVote | null {
  return readQueue().find((queued) => sameTarget(queued, target)) ?? null;
}

export function subscribeQueuedVotes(listener: () => void): () => void {
  const onStorage = (event: StorageEvent): void => {
    if (event.key === VOTE_QUEUE_KEY || event.key === null) listener();
  };
  queueListeners.add(listener);
  globalThis.addEventListener('storage', onStorage);
  return () => {
    queueListeners.delete(listener);
    globalThis.removeEventListener('storage', onStorage);
  };
}

export function clearOfflineEventData(): void {
  remove(SNAPSHOT_KEY);
  writeQueue([]);
}
