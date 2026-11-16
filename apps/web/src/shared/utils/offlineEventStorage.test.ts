import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventData } from '@/shared/types/event';
import type { MovieData } from '@/shared/types/movie';
import {
  clearOfflineEventData,
  forgetLastEventSnapshot,
  queueVote,
  readLastEventSnapshot,
  readQueuedVotes,
  removeQueuedVote,
  saveLastEventSnapshot,
  subscribeQueuedVotes,
} from '@/shared/utils/offlineEventStorage';
import { clearStoredEventIdentities } from '@/shared/utils/eventIdentityStorage';

const event = {
  id: 'evt-1',
  slug: 'soiree',
  title: 'Soirée',
  date: '2026-11-20',
  time: '20:30',
} as EventData;
const movies = [{ id: 'mov-1', title: 'Alien', score: 2, myVote: 1 }] as MovieData[];

describe('offlineEventStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('last event snapshot', () => {
    it('reads back the last event saved for the same slug', () => {
      saveLastEventSnapshot({ slug: 'soiree', savedAt: 1000, event, movies });

      expect(readLastEventSnapshot('soiree')).toEqual({
        slug: 'soiree',
        savedAt: 1000,
        event,
        movies,
      });
    });

    it('keeps only the last event viewed', () => {
      saveLastEventSnapshot({ slug: 'soiree', savedAt: 1000, event, movies });
      saveLastEventSnapshot({
        slug: 'autre',
        savedAt: 2000,
        event: { ...event, slug: 'autre' },
        movies,
      });

      expect(readLastEventSnapshot('soiree')).toBeNull();
      expect(readLastEventSnapshot('autre')?.savedAt).toBe(2000);
    });

    it('forgets the snapshot of one event without touching another', () => {
      saveLastEventSnapshot({ slug: 'soiree', savedAt: 1000, event, movies });

      forgetLastEventSnapshot('autre');
      expect(readLastEventSnapshot('soiree')).not.toBeNull();

      forgetLastEventSnapshot('soiree');
      expect(readLastEventSnapshot('soiree')).toBeNull();
    });

    it('ignores a corrupted entry', () => {
      localStorage.setItem('mp.offline-last-event', '{not json');

      expect(readLastEventSnapshot('soiree')).toBeNull();
    });
  });

  describe('queued votes', () => {
    it('keeps the last intent per movie and participant', () => {
      queueVote({ slug: 'soiree', movieId: 'mov-1', participantId: 'p-1', value: 1, queuedAt: 1 });
      queueVote({ slug: 'soiree', movieId: 'mov-1', participantId: 'p-1', value: 0, queuedAt: 2 });
      queueVote({ slug: 'soiree', movieId: 'mov-2', participantId: 'p-1', value: -1, queuedAt: 3 });

      expect(readQueuedVotes('soiree')).toEqual([
        { slug: 'soiree', movieId: 'mov-1', participantId: 'p-1', value: 0, queuedAt: 2 },
        { slug: 'soiree', movieId: 'mov-2', participantId: 'p-1', value: -1, queuedAt: 3 },
      ]);
    });

    it('filters by event and returns every event without a slug', () => {
      queueVote({ slug: 'soiree', movieId: 'mov-1', participantId: 'p-1', value: 1, queuedAt: 1 });
      queueVote({ slug: 'autre', movieId: 'mov-9', participantId: 'p-2', value: 1, queuedAt: 2 });

      expect(readQueuedVotes('autre')).toHaveLength(1);
      expect(readQueuedVotes()).toHaveLength(2);
    });

    it('removes a replayed vote and tells the listeners', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeQueuedVotes(listener);
      queueVote({ slug: 'soiree', movieId: 'mov-1', participantId: 'p-1', value: 1, queuedAt: 1 });

      removeQueuedVote({
        slug: 'soiree',
        movieId: 'mov-1',
        participantId: 'p-1',
        value: 1,
        queuedAt: 1,
      });

      expect(readQueuedVotes()).toEqual([]);
      expect(listener).toHaveBeenCalledTimes(2);
      unsubscribe();
    });

    it('removing a sent intent keeps a newer one queued for the same movie meanwhile', () => {
      const sent = {
        slug: 'soiree',
        movieId: 'mov-1',
        participantId: 'p-1',
        value: 1,
        queuedAt: 1,
      } as const;
      queueVote(sent);
      queueVote({ ...sent, value: 0, queuedAt: 2 });

      removeQueuedVote(sent);

      expect(readQueuedVotes('soiree')).toEqual([{ ...sent, value: 0, queuedAt: 2 }]);
    });

    it('tells the listeners when another tab changes the queue', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeQueuedVotes(listener);

      globalThis.dispatchEvent(new StorageEvent('storage', { key: 'mp.offline-votes' }));
      globalThis.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));

      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
    });
  });

  it('forgets the snapshot and the queue on sign-out', () => {
    saveLastEventSnapshot({ slug: 'soiree', savedAt: 1000, event, movies });
    queueVote({ slug: 'soiree', movieId: 'mov-1', participantId: 'p-1', value: 1, queuedAt: 1 });

    clearStoredEventIdentities();

    expect(readLastEventSnapshot('soiree')).toBeNull();
    expect(readQueuedVotes()).toEqual([]);
  });

  it('clearOfflineEventData empties both stores', () => {
    saveLastEventSnapshot({ slug: 'soiree', savedAt: 1000, event, movies });
    queueVote({ slug: 'soiree', movieId: 'mov-1', participantId: 'p-1', value: 1, queuedAt: 1 });

    clearOfflineEventData();

    expect(readLastEventSnapshot('soiree')).toBeNull();
    expect(readQueuedVotes()).toEqual([]);
  });

  it('survives a storage that refuses writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(() =>
      saveLastEventSnapshot({ slug: 'soiree', savedAt: 1, event, movies })
    ).not.toThrow();
    expect(() =>
      queueVote({ slug: 'soiree', movieId: 'mov-1', participantId: 'p-1', value: 1, queuedAt: 1 })
    ).not.toThrow();
  });
});
