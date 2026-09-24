import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteEventWheel,
  deleteEventWinner,
  postEventWheel,
  postEventWheelAnnounce,
  postEventWinner,
} from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { remainingWheelRevealDelayMs, WHEEL_SPIN_DURATION_MS } from '@/shared/utils/wheelSpin';

export type EventPrimaryAction = 'add' | 'spin' | null;

export type EventWheelState = {
  isHost: boolean;
  winnerIds: string[];
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
  noMovie: boolean;
  canRelaunchFromModal: boolean;
  wheelLocked: boolean;
  launch: () => void;
  reset: () => void;
  dismissModal: () => void;
  revealWinner: () => void;

  manualReveal: boolean;
  manualMode: boolean;
  removalMode: boolean;
  drawableMovies: MovieData[];
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
  return event?.winners?.at(-1) ?? null;
}

type SpinAvailability = {
  moviesCount: number;
  noEligibleMovie: boolean;
  remainingDraws: number;
  winnerCount: number;
  drawableCount: number;
};

function spinDisabledHintOf(s: SpinAvailability, t: Translate): string | null {
  if (s.moviesCount === 0) return t('events.wheel.emptyPlaceholder');
  if (s.noEligibleMovie) return t('events.wheel.allExcludedHint');
  if (s.remainingDraws === 0)
    return pluralizeCount(
      s.winnerCount,
      'events.wheel.allDrawnHintOne',
      'events.wheel.allDrawnHintMany',
      t
    );
  if (s.drawableCount === 0) return t('events.wheel.nothingLeftToDrawHint');
  return null;
}

function primaryActionOf(input: {
  canSpin: boolean;
  noMovie: boolean;
  guestCanAdd: boolean;
}): EventPrimaryAction {
  if (input.canSpin) return input.noMovie ? 'add' : 'spin';
  return input.guestCanAdd ? 'add' : null;
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
  const last = lastPick(event);
  const [pendingRevealId, setPendingRevealId] = useState<string | null>(() =>
    last && remainingWheelRevealDelayMs(last.pickMethod, last.pickedAt) > 0 ? last.movieId : null
  );
  const [spinWinner, setSpinWinner] = useState<MovieData | null>(null);
  const [spinPool, setSpinPool] = useState<MovieData[]>([]);
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
  useEffect(() => {
    setLocallyDrawnIds((ids) =>
      ids.some((id) => allWinnerIds.includes(id))
        ? ids.filter((id) => !allWinnerIds.includes(id))
        : ids
    );
  }, [allWinnerIds]);

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

  const finishesOnFirstDraw = event?.lifecycle === 'pending';
  const winnerCount = finishesOnFirstDraw ? 1 : (event?.config?.winnerCount ?? 1);
  const remainingDraws = Math.max(0, winnerCount - drawnIds.length);

  const lastPickedAt = last?.pickedAt;
  const lastPickMethod = last?.pickMethod;
  const lastMovieId = last?.movieId;

  useEffect(() => {
    if (isModalOpen) return undefined;
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

  const announceRef = useRef<{ timer: number | null; sent: boolean }>({ timer: null, sent: false });

  const announceWinner = useCallback(() => {
    const pending = announceRef.current;
    if (pending.timer !== null) {
      window.clearTimeout(pending.timer);
      pending.timer = null;
    }
    if (pending.sent) return;
    pending.sent = true;
    postEventWheelAnnounce(slug, hostToken).catch(() => undefined);
  }, [slug, hostToken]);

  const latestAnnounceWinnerRef = useRef(announceWinner);
  useEffect(() => {
    latestAnnounceWinnerRef.current = announceWinner;
  }, [announceWinner]);

  useEffect(
    () => () => {
      if (announceRef.current.timer !== null) latestAnnounceWinnerRef.current();
    },
    []
  );

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
    postEventWheel(slug, hostToken, drawnIds.length)
      .then((res) => {
        const drawnNow = drawableMovies.some((m) => m.id === res.winner.id);
        const pool = drawnNow ? drawableMovies : [res.winner];
        setSpinPool(pool);
        setLocallyDrawnIds((ids) => (ids.includes(res.winner.id) ? ids : [...ids, res.winner.id]));
        setPendingRevealId(res.winner.id);
        setSpinWinner(res.winner);
        setWinnerIndex(pool.findIndex((m) => m.id === res.winner.id));
        setManualReveal(false);
        setWheelKey((k) => k + 1);
        setIsModalOpen(true);
        announceRef.current = { timer: null, sent: false };
        announceRef.current.timer = window.setTimeout(announceWinner, WHEEL_SPIN_DURATION_MS);
        track('movie_picked', { method: 'wheel' });
      })
      .catch((err) => setError(getErrorMessage(err, t('events.wheel.launchError'))))
      .finally(() => setLoading(false));
  }, [slug, hostToken, drawnIds.length, drawableMovies, announceWinner, track, t]);

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
          setRemovalMode(false);
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
        setRemovalMode(false);
        onWheelDone();
      })
      .catch((err) => setError(getErrorMessage(err, t('events.wheel.resetError'))))
      .finally(() => setLoading(false));
  }, [slug, hostToken, onWheelDone, t]);

  const revealWinner = useCallback(() => {
    setPendingRevealId(null);
    announceWinner();
  }, [announceWinner]);

  const dismissModal = useCallback(() => {
    setIsModalOpen(false);
    setPendingRevealId(null);
    announceWinner();
    onWheelDone();
  }, [onWheelDone, announceWinner]);

  const isOpenForActions = isHost && !!event && !event.isFinished;
  const selecting = manualMode || removalMode;
  const hasWinner = allWinnerIds.length > 0;
  const canSpin = isOpenForActions && !selecting;

  const spinDisabledHint = spinDisabledHintOf(
    {
      moviesCount,
      noEligibleMovie,
      remainingDraws,
      winnerCount,
      drawableCount: drawableMovies.length,
    },
    t
  );
  const spinDisabled = spinDisabledHint !== null;
  const primaryAction = primaryActionOf({
    canSpin,
    noMovie: moviesCount === 0,
    guestCanAdd: !isHost && !!event && !event.isFinished && !hasWinner && !selecting,
  });

  return {
    isHost,
    winnerIds,
    spinWinner,
    spinPool,
    winnerIndex,
    wheelKey,
    loading,
    error,
    isModalOpen,
    canSpin,
    spinDisabled,
    spinDisabledHint,
    remainingDraws,
    winnerCount,
    primaryAction,
    showRemoveWinner: isOpenForActions && hasWinner && !selecting,
    showReset: isOpenForActions && hasWinner && !selecting,
    noMovie: moviesCount === 0,
    canRelaunchFromModal:
      isOpenForActions && !manualReveal && remainingDraws > 0 && drawableMovies.length > 0,
    wheelLocked: drawnIds.length > 0,
    launch,
    reset,
    dismissModal,
    revealWinner,

    manualReveal,
    manualMode,
    removalMode,
    drawableMovies,
    enterManualMode,
    cancelManualMode,
    pickWinnerManually,
    enterRemovalMode,
    cancelRemovalMode,
    removeWinner,
  };
}
