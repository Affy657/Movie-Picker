import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteEventWheel,
  postEventClose,
  postEventWheel,
  postEventWinner,
} from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import type { WinnerPickMethod } from '@/shared/types/event';
import type { MovieData } from '@/shared/types/movie';
import { useTranslation } from '@/shared/i18n';
import { useAnalytics } from '@/shared/hooks/useAnalytics';

export type EventWheelState = {
  isHost: boolean;
  winner: MovieData | null;
  winnerIndex: number;
  wheelKey: number;
  loading: boolean;
  error: string | null;
  isModalOpen: boolean;
  canSpin: boolean;

  spinDisabled: boolean;
  showRelaunch: boolean;
  showReset: boolean;
  showClose: boolean;
  launch: () => void;
  reset: () => void;
  closeEvent: () => void;
  dismissModal: () => void;

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
  const [winner, setWinner] = useState<MovieData | null>(event?.winnerMovie ?? null);
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
    setWinner(event?.winnerMovie ?? null);
    setPickMethod(event?.winnerPickMethod ?? null);
  }, [event?.winnerMovie, event?.winnerPickMethod]);

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
        setWinner(res.winner);
        setPickMethod('wheel');
        setWinnerIndex(Math.max(idx, 0));
        setManualReveal(false);
        setWheelKey((k) => k + 1);
        setIsModalOpen(true);
        track('movie_picked', { method: 'wheel' });
      })
      .catch((err) => setError(getErrorMessage(err, t('events.wheel.launchError'))))
      .finally(() => setLoading(false));
  }, [slug, hostToken, eligibleMovies, track, t]);

  const pickWinnerManually = useCallback(
    (movie: MovieData) => {
      setError(null);
      setLoading(true);
      postEventWinner(slug, movie.id, hostToken)
        .then((res) => {
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

  const dismissModal = useCallback(() => {
    setIsModalOpen(false);
    onWheelDone();
  }, [onWheelDone]);

  const isOpenForActions = isHost && !!event && !event.isFinished;

  return {
    isHost,
    winner,
    winnerIndex,
    wheelKey,
    loading,
    error,
    isModalOpen,
    canSpin: isOpenForActions && !manualMode,
    spinDisabled: moviesCount === 0 || noEligibleMovie,
    showRelaunch: isOpenForActions && !!winner && moviesCount > 0 && !manualMode,
    showReset: isOpenForActions && !!winner && !manualMode,
    showClose: isOpenForActions && (!!winner || !!event?.closedAt),
    launch,
    reset,
    closeEvent,
    dismissModal,

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
