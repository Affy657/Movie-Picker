import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteEventWheel,
  deleteEventWinner,
  postEventWheel,
  postEventWinner,
} from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import type { WinnerPickMethod } from '@/shared/types/event';
import type { MovieData } from '@/shared/types/movie';
import { useTranslation } from '@/shared/i18n';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { remainingWheelRevealDelayMs } from '@/shared/utils/wheelSpin';

export type EventPrimaryAction = 'add' | 'spin' | null;

export type EventWheelState = {
  isHost: boolean;
  winnerIds: string[];
  winners: MovieData[];
  spinWinner: MovieData | null;
  spinPool: MovieData[];
  winnerIndex: number;
  wheelKey: number;
  loading: boolean;
  error: string | null;
  isModalOpen: boolean;
  canSpin: boolean;

  spinDisabled: boolean;
  spinDisabledHint: string | null;
  remainingDraws: number;
  winnerCount: number;
  primaryAction: EventPrimaryAction;
  showRemoveWinner: boolean;
  showReset: boolean;
  canRelaunchFromModal: boolean;
  launch: () => void;
  reset: () => void;
  dismissModal: () => void;
  revealWinner: () => void;

  pickMethod: WinnerPickMethod | null;
  manualReveal: boolean;
  manualMode: boolean;
  removalMode: boolean;
  eligibleMovies: MovieData[];
  drawableMovies: MovieData[];
  noEligibleMovie: boolean;
  enterManualMode: () => void;
  cancelManualMode: () => void;
  pickWinnerManually: (movie: MovieData) => void;
  enterRemovalMode: () => void;
  cancelRemovalMode: () => void;
  removeWinner: (movie: MovieData) => void;
};

type UseEventWheelOptions = {
  slug: string;
  event: EventData | undefined;
  movies: MovieData[];
  hostToken: string | null;
  onWheelDone: () => void;
};

function lastPick(event: EventData | undefined) {
  const winners = event?.winners ?? [];
  return winners.length > 0 ? winners[winners.length - 1]! : null;
}

export function useEventWheel({
  slug,
  event,
  movies,
  hostToken,
  onWheelDone,
}: UseEventWheelOptions): EventWheelState {
  const { t } = useTranslation();
  const { track } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState(-1);
  const [wheelKey, setWheelKey] = useState(0);
  const [pendingRevealId, setPendingRevealId] = useState<string | null>(() => {
    const last = lastPick(event);
    if (!last) return null;
    return remainingWheelRevealDelayMs(last.pickMethod, last.pickedAt) > 0 ? last.movieId : null;
  });
  const [spinWinner, setSpinWinner] = useState<MovieData | null>(null);
  const [spinPool, setSpinPool] = useState<MovieData[]>([]);
  const [pickMethod, setPickMethod] = useState<WinnerPickMethod | null>(
    () => lastPick(event)?.pickMethod ?? null
  );
  const [locallyDrawnIds, setLocallyDrawnIds] = useState<string[]>([]);
  const [manualReveal, setManualReveal] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [removalMode, setRemovalMode] = useState(false);

  const isHost = event?.isHost === true || (event?.isHost == null && !!hostToken);
  const safeMovies = useMemo(() => movies ?? [], [movies]);
  const moviesCount = safeMovies.length;
  const eligibleMovies = useMemo(
    () => safeMovies.filter((m) => !m.excludedFromWheel),
    [safeMovies]
  );
  const noEligibleMovie = moviesCount > 0 && eligibleMovies.length === 0;

  const allWinnerIds = useMemo(
    () => (event?.winners ?? []).map((w) => w.movieId),
    [event?.winners]
  );
  const winnerIds = useMemo(
    () => allWinnerIds.filter((id) => id !== pendingRevealId),
    [allWinnerIds, pendingRevealId]
  );
  const winners = useMemo(
    () =>
      winnerIds
        .map((id) => safeMovies.find((m) => m.id === id) ?? null)
        .filter((m): m is MovieData => m !== null),
    [winnerIds, safeMovies]
  );
  const drawnIds = useMemo(() => {
    const merged = [...allWinnerIds];
    for (const id of locallyDrawnIds) {
      if (!merged.includes(id)) merged.push(id);
    }
    return merged;
  }, [allWinnerIds, locallyDrawnIds]);
  const drawableMovies = useMemo(
    () => eligibleMovies.filter((m) => !drawnIds.includes(m.id)),
    [eligibleMovies, drawnIds]
  );

  const winnerCount = event?.config?.winnerCount ?? 1;
  const remainingDraws = Math.max(0, winnerCount - drawnIds.length);

  const lastPickedAt = lastPick(event)?.pickedAt;
  const lastPickMethod = lastPick(event)?.pickMethod;
  const lastMovieId = lastPick(event)?.movieId;

  useEffect(() => {
    if (isModalOpen) return undefined;
    setPickMethod(lastPickMethod ?? null);
    const delay = remainingWheelRevealDelayMs(lastPickMethod, lastPickedAt);
    if (delay <= 0) {
      setPendingRevealId(null);
      setSpinWinner(null);
      return undefined;
    }
    setPendingRevealId(lastMovieId ?? null);
    setSpinWinner(null);
    const timer = window.setTimeout(() => {
      setPendingRevealId(null);
      setSpinWinner(null);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [lastMovieId, lastPickMethod, lastPickedAt, isModalOpen]);

  const cancelManualMode = useCallback(() => setManualMode(false), []);
  const enterManualMode = useCallback(() => {
    setRemovalMode(false);
    setManualMode(true);
  }, []);
  const cancelRemovalMode = useCallback(() => setRemovalMode(false), []);
  const enterRemovalMode = useCallback(() => {
    setManualMode(false);
    setRemovalMode(true);
  }, []);

  useEffect(() => {
    if (!manualMode && !removalMode) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      cancelManualMode();
      cancelRemovalMode();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [manualMode, removalMode, cancelManualMode, cancelRemovalMode]);

  const launch = useCallback(() => {
    setError(null);
    setLoading(true);
    postEventWheel(slug, hostToken)
      .then((res) => {
        const pool = drawableMovies;
        const idx = pool.findIndex((m) => m.id === res.winner.id);
        setSpinPool(pool);
        setLocallyDrawnIds((ids) => (ids.includes(res.winner.id) ? ids : [...ids, res.winner.id]));
        setPendingRevealId(res.winner.id);
        setSpinWinner(res.winner);
        setPickMethod('wheel');
        setWinnerIndex(Math.max(idx, 0));
        setManualReveal(false);
        setWheelKey((k) => k + 1);
        setIsModalOpen(true);
        track('movie_picked', { method: 'wheel' });
      })
      .catch((err) => setError(getErrorMessage(err, t('events.wheel.launchError'))))
      .finally(() => setLoading(false));
  }, [slug, hostToken, drawableMovies, track, t]);

  const pickWinnerManually = useCallback(
    (movie: MovieData) => {
      setError(null);
      setLoading(true);
      postEventWinner(slug, movie.id, hostToken)
        .then((res) => {
          setPendingRevealId(null);
          setSpinPool([res.winner]);
          setLocallyDrawnIds((ids) =>
            ids.includes(res.winner.id) ? ids : [...ids, res.winner.id]
          );
          setSpinWinner(res.winner);
          setPickMethod('manual');
          setWinnerIndex(0);
          setManualReveal(true);
          setWheelKey((k) => k + 1);
          setIsModalOpen(true);
          setManualMode(false);
          track('movie_picked', { method: 'manual' });
        })
        .catch((err) => setError(getErrorMessage(err, t('events.wheel.manualPickError'))))
        .finally(() => setLoading(false));
    },
    [slug, hostToken, track, t]
  );

  const removeWinner = useCallback(
    (movie: MovieData) => {
      setError(null);
      setLoading(true);
      deleteEventWinner(slug, movie.id, hostToken)
        .then(() => {
          setPendingRevealId(null);
          setSpinWinner(null);
          setLocallyDrawnIds([]);
          onWheelDone();
        })
        .catch((err) => setError(getErrorMessage(err, t('events.wheel.removeWinnerError'))))
        .finally(() => setLoading(false));
    },
    [slug, hostToken, onWheelDone, t]
  );

  const reset = useCallback(() => {
    setError(null);
    setLoading(true);
    deleteEventWheel(slug, hostToken)
      .then(() => {
        setPendingRevealId(null);
        setSpinWinner(null);
        setLocallyDrawnIds([]);
        setPickMethod(null);
        setRemovalMode(false);
        onWheelDone();
      })
      .catch((err) => setError(getErrorMessage(err, t('events.wheel.resetError'))))
      .finally(() => setLoading(false));
  }, [slug, hostToken, onWheelDone, t]);

  const revealWinner = useCallback(() => {
    setPendingRevealId(null);
  }, []);

  const dismissModal = useCallback(() => {
    setIsModalOpen(false);
    setPendingRevealId(null);
    onWheelDone();
  }, [onWheelDone]);

  const isOpenForActions = isHost && !!event && !event.isFinished;
  const selecting = manualMode || removalMode;
  const hasWinner = allWinnerIds.length > 0;

  let spinDisabledHint: string | null = null;
  if (moviesCount === 0) spinDisabledHint = t('events.wheel.emptyPlaceholder');
  else if (noEligibleMovie) spinDisabledHint = t('events.wheel.allExcludedHint');
  else if (remainingDraws === 0)
    spinDisabledHint =
      winnerCount === 1
        ? t('events.wheel.allDrawnHintOne')
        : t('events.wheel.allDrawnHintMany', { count: winnerCount });
  else if (drawableMovies.length === 0) spinDisabledHint = t('events.wheel.nothingLeftToDrawHint');
  const spinDisabled = spinDisabledHint !== null;

  let primaryAction: EventPrimaryAction = null;
  if (isOpenForActions && !selecting) {
    primaryAction = spinDisabled && moviesCount === 0 ? 'add' : 'spin';
  } else if (!isHost && !!event && !event.isFinished && !hasWinner && !selecting) {
    primaryAction = 'add';
  }

  return {
    isHost,
    winnerIds,
    winners,
    spinWinner,
    spinPool,
    winnerIndex,
    wheelKey,
    loading,
    error,
    isModalOpen,
    canSpin: isOpenForActions && !selecting,
    spinDisabled,
    spinDisabledHint,
    remainingDraws,
    winnerCount,
    primaryAction,
    showRemoveWinner: isOpenForActions && hasWinner && !selecting,
    showReset: isOpenForActions && hasWinner && !selecting,
    canRelaunchFromModal:
      isOpenForActions && !manualReveal && remainingDraws > 0 && drawableMovies.length > 0,
    launch,
    reset,
    dismissModal,
    revealWinner,

    pickMethod,
    manualReveal,
    manualMode,
    removalMode,
    eligibleMovies,
    drawableMovies,
    noEligibleMovie,
    enterManualMode,
    cancelManualMode,
    pickWinnerManually,
    enterRemovalMode,
    cancelRemovalMode,
    removeWinner,
  };
}
