import { useCallback, useEffect, useRef, useState } from 'react';
import { clearMovieVote, voteMovie } from '@/features/events/api/eventMoviesApi';
import { ApiError, getErrorMessage } from '@/shared/api/apiError';
import type { Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import {
  latestQueuedVote,
  removeQueuedVote,
  type QueuedVote,
} from '@/shared/utils/offlineEventStorage';
import { useQueuedVotes } from '@/features/events/offline/queuedVotes';

export type OfflineVoteReport = { message: string; tone: 'success' | 'warning' };

export type OfflineVoteOutcome = { saved: number; refused: number; reason: string | null };

export const OFFLINE_VOTE_RETRY_BASE_MS = 2_000;

export const OFFLINE_VOTE_RETRY_MAX_MS = 60_000;

function retryDelayMs(interruptions: number): number {
  return Math.min(OFFLINE_VOTE_RETRY_BASE_MS * 2 ** (interruptions - 1), OFFLINE_VOTE_RETRY_MAX_MS);
}

async function send(vote: QueuedVote): Promise<void> {
  if (vote.value === 0) {
    await clearMovieVote(vote.slug, vote.movieId, vote.participantId);
    return;
  }
  await voteMovie(vote.slug, vote.movieId, vote.participantId, vote.value);
}

type ReplayRound = { outcome: OfflineVoteOutcome; interrupted: boolean };

async function replay(targets: readonly QueuedVote[]): Promise<ReplayRound> {
  const outcome: OfflineVoteOutcome = { saved: 0, refused: 0, reason: null };
  for (const target of targets) {
    const vote = latestQueuedVote(target);
    if (!vote) continue;
    try {
      await send(vote);
      outcome.saved += 1;
    } catch (error) {
      if (ApiError.is(error) && error.code === 0) return { outcome, interrupted: true };
      outcome.refused += 1;
      outcome.reason ??= getErrorMessage(error, '') || null;
    }
    removeQueuedVote(vote);
  }
  return { outcome, interrupted: false };
}

function mergeOutcomes(
  previous: OfflineVoteOutcome | null,
  next: OfflineVoteOutcome
): OfflineVoteOutcome {
  if (!previous) return next;
  return {
    saved: previous.saved + next.saved,
    refused: previous.refused + next.refused,
    reason: previous.reason ?? next.reason,
  };
}

export function offlineVoteReport(
  outcome: OfflineVoteOutcome | null,
  t: Translate
): OfflineVoteReport | null {
  if (!outcome) return null;
  if (outcome.refused > 0) {
    return {
      tone: 'warning',
      message: pluralizeCount(
        outcome.refused,
        'events.detail.offlineVotesRefusedOne',
        'events.detail.offlineVotesRefused',
        t,
        { reason: outcome.reason ?? t('errors.generic') }
      ),
    };
  }
  if (outcome.saved > 0) {
    return {
      tone: 'success',
      message: pluralizeCount(
        outcome.saved,
        'events.detail.offlineVotesSavedOne',
        'events.detail.offlineVotesSaved',
        t
      ),
    };
  }
  return null;
}

export function useOfflineVoteReplay({
  slug,
  onReplayed,
  serverReachedAt = 0,
}: {
  slug: string | undefined;
  onReplayed: () => void;
  serverReachedAt?: number;
}): { outcome: OfflineVoteOutcome | null; dismiss: () => void } {
  const online = useOnlineStatus();
  const queued = useQueuedVotes(slug);
  const [outcome, setOutcome] = useState<OfflineVoteOutcome | null>(null);
  const [round, setRound] = useState(0);
  const [interruptions, setInterruptions] = useState(0);
  const replaying = useRef(false);
  const onReplayedRef = useRef(onReplayed);

  useEffect(() => {
    onReplayedRef.current = onReplayed;
  }, [onReplayed]);

  useEffect(() => {
    if (interruptions === 0) return;
    const timer = globalThis.setTimeout(
      () => setRound((value) => value + 1),
      retryDelayMs(interruptions)
    );
    return () => globalThis.clearTimeout(timer);
  }, [interruptions]);

  useEffect(() => {
    if (!online || queued.length === 0 || replaying.current) return;
    replaying.current = true;
    void replay(queued)
      .then(({ outcome: result, interrupted }) => {
        replaying.current = false;
        const handled = result.saved + result.refused > 0;
        if (handled) {
          onReplayedRef.current();
          setOutcome((previous) => mergeOutcomes(previous, result));
        }
        if (interrupted) {
          setInterruptions((value) => value + 1);
          return;
        }
        setInterruptions(0);
        if (handled) setRound((value) => value + 1);
      })
      .catch(() => {
        replaying.current = false;
      });
  }, [online, queued, round, serverReachedAt]);

  const dismiss = useCallback(() => setOutcome(null), []);

  return { outcome, dismiss };
}
