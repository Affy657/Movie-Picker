import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteEventWheel,
  postEventClose,
  postEventWheel,
  postEventWheelAnnounce,
  postEventWinner,
} from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import type { WinnerPickMethod } from '@/shared/types/event';
import type { MovieData } from '@/shared/types/movie';
import { useTranslation } from '@/shared/i18n';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { remainingWheelRevealDelayMs, WHEEL_SPIN_DURATION_MS } from '@/shared/utils/wheelSpin';

export type EventPrimaryAction = 'add' | 'spin' | 'close' | null;

export type EventWheelState = {
  isHost: boolean;
  winner: MovieData | null;
  spinWinner: MovieData | null;
  winnerIndex: number;
  wheelKey: number;
  loading: boolean;
  error: string | null;
  isModalOpen: boolean;
  canSpin: boolean;

  spinDisabled: boolean;
  primaryAction: EventPrimaryAction;
  showRelaunch: boolean;
  showReset: boolean;
  showClose: boolean;
  closeWithoutMovie: boolean;
  launch: () => void;
  reset: () => void;
  closeEvent: () => void;
  dismissModal: () => void;
  revealWinner: () => void;

  pickMethod: WinnerPickMethod | null;
  manualReveal: boolean;
  manualMode: boolean;
  eligibleMovies: MovieData[];
  noEligibleMovie: boolean;
  enterManualMode: () => void;
  cancelManualMode: () => void;
  pickWinnerManually: (movie: MovieData) => void;
};

type UseEventWheelOptions = {
  slug: string;
  event: EventData | undefined;
  movies: MovieData[];
  hostToken: string | null;
  onWheelDone: () => void;
  onCloseDone: () => void;
};

function initialWinner(event: UseEventWheelOptions['event']): MovieData | null {
  if (!event?.winnerMovie) return null;
  if (remainingWheelRevealDelayMs(event.winnerPickMethod, event.winnerPickedAt) > 0) return null;
  return event.winnerMovie;
}

type PrimaryActionInputs = {
  isOpenForActions: boolean;
  manualMode: boolean;
  isHost: boolean;
  eventIsLive: boolean;
  hasWinner: boolean;
  spinDisabled: boolean;
};

function resolvePrimaryAction({
  isOpenForActions,
  manualMode,
  isHost,
  eventIsLive,
  hasWinner,
  spinDisabled,
}: PrimaryActionInputs): EventPrimaryAction {
  if (isOpenForActions && !manualMode) {
    if (hasWinner) return 'close';
    if (spinDisabled) return 'add';
    return 'spin';
  }
  if (!isHost && eventIsLive && !hasWinner && !manualMode) return 'add';
  return null;
}

export function useEventWheel({
  slug,
  event,
  movies,
  hostToken,
  onWheelDone,
  onCloseDone,
}: UseEventWheelOptions): EventWheelState {
  const { t } = useTranslation();
  const { track } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState(-1);
  const [wheelKey, setWheelKey] = useState(0);
  const [winner, setWinner] = useState<MovieData | null>(() => initialWinner(event));
  const [spinWinner, setSpinWinner] = useState<MovieData | null>(null);
  const [pickMethod, setPickMethod] = useState<WinnerPickMethod | null>(
    event?.winnerPickMethod ?? null
  );
  const [manualReveal, setManualReveal] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const isHost = event?.isHost === true || (event?.isHost == null && !!hostToken);
  const safeMovies = useMemo(() => movies ?? [], [movies]);
  const moviesCount = safeMovies.length;
  const eligibleMovies = useMemo(
    () => safeMovies.filter((m) => !m.excludedFromWheel),
    [safeMovies]
  );
  const noEligibleMovie = moviesCount > 0 && eligibleMovies.length === 0;

  useEffect(() => {
    if (isModalOpen) return undefined;
    const movie = event?.winnerMovie ?? null;
    const method = event?.winnerPickMethod ?? null;
    const delay = remainingWheelRevealDelayMs(event?.winnerPickMethod, event?.winnerPickedAt);
    const reveal = (revealed: MovieData | null) => {
      setWinner(revealed);
      setPickMethod(method);
      setSpinWinner(null);
    };

    if (delay <= 0) {
      reveal(movie);
      return undefined;
    }

    reveal(null);
    const timer = window.setTimeout(() => reveal(movie), delay);
    return () => window.clearTimeout(timer);
  }, [event?.winnerMovie, event?.winnerPickMethod, event?.winnerPickedAt, isModalOpen]);

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

  useEffect(
    () => () => {
      if (announceRef.current.timer !== null) window.clearTimeout(announceRef.current.timer);
    },
    []
  );

  const cancelManualMode = useCallback(() => setManualMode(false), []);
  const enterManualMode = useCallback(() => setManualMode(true), []);

  useEffect(() => {
    if (!manualMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelManualMode();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [manualMode, cancelManualMode]);

  const launch = useCallback(() => {
    setError(null);
    setLoading(true);
    postEventWheel(slug, hostToken)
      .then((res) => {
        const idx = eligibleMovies.findIndex((m) => m.id === res.winner.id);
        setWinner(null);
        setSpinWinner(res.winner);
        setPickMethod('wheel');
        setWinnerIndex(Math.max(idx, 0));
        setManualReveal(false);
        setWheelKey((k) => k + 1);
        setIsModalOpen(true);
        announceRef.current = { timer: null, sent: false };
        announceRef.current.timer = window.setTimeout(announceWinner, WHEEL_SPIN_DURATION_MS);
        track('movie_picked', { method: 'wheel' });
      })
      .catch((err) => setError(getErrorMessage(err, t('events.wheel.launchError'))))
      .finally(() => setLoading(false));
  }, [slug, hostToken, eligibleMovies, announceWinner, track, t]);

  const pickWinnerManually = useCallback(
    (movie: MovieData) => {
      setError(null);
      setLoading(true);
      postEventWinner(slug, movie.id, hostToken)
        .then((res) => {
          setSpinWinner(res.winner);
          setWinner(res.winner);
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

  const reset = useCallback(() => {
    setError(null);
    setLoading(true);
    deleteEventWheel(slug, hostToken)
      .then(() => {
        setWinner(null);
        setSpinWinner(null);
        setPickMethod(null);
        onWheelDone();
      })
      .catch((err) => setError(getErrorMessage(err, t('events.wheel.resetError'))))
      .finally(() => setLoading(false));
  }, [slug, hostToken, onWheelDone, t]);

  const closeEvent = useCallback(() => {
    setError(null);
    setLoading(true);
    postEventClose(slug, hostToken)
      .then(() => {
        track('event_closed');
        onCloseDone();
      })
      .catch((err) => setError(getErrorMessage(err, t('events.wheel.closeError'))))
      .finally(() => setLoading(false));
  }, [slug, hostToken, onCloseDone, track, t]);

  const revealWinner = useCallback(() => {
    setWinner(spinWinner);
    announceWinner();
  }, [spinWinner, announceWinner]);

  const dismissModal = useCallback(() => {
    setIsModalOpen(false);
    setWinner((current) => current ?? spinWinner);
    announceWinner();
    onWheelDone();
  }, [onWheelDone, spinWinner, announceWinner]);

  const isOpenForActions = isHost && !!event && !event.isFinished;
  const isPendingWithoutWinner = isOpenForActions && !winner && event?.lifecycle === 'pending';
  const spinDisabled = moviesCount === 0 || noEligibleMovie;

  const eventIsLive = !!event && !event.isFinished;
  const primaryAction = resolvePrimaryAction({
    isOpenForActions,
    manualMode,
    isHost,
    eventIsLive,
    hasWinner: !!winner,
    spinDisabled,
  });

  return {
    isHost,
    winner,
    spinWinner,
    winnerIndex,
    wheelKey,
    loading,
    error,
    isModalOpen,
    canSpin: isOpenForActions && !manualMode,
    spinDisabled,
    primaryAction,
    showRelaunch: isOpenForActions && !!winner && moviesCount > 0 && !manualMode,
    showReset: isOpenForActions && !!winner && !manualMode,
    showClose: isOpenForActions && (!!winner || !!event?.closedAt || isPendingWithoutWinner),
    closeWithoutMovie: isPendingWithoutWinner,
    launch,
    reset,
    closeEvent,
    dismissModal,
    revealWinner,

    pickMethod,
    manualReveal,
    manualMode,
    eligibleMovies,
    noEligibleMovie,
    enterManualMode,
    cancelManualMode,
    pickWinnerManually,
  };
}
