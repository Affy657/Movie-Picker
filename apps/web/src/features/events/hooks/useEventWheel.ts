import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteEventWheel, postEventClose, postEventWheel } from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
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

  const isHost = event?.isHost === true || (event?.isHost == null && !!hostToken);
  const safeMovies = useMemo(() => movies ?? [], [movies]);
  const moviesCount = safeMovies.length;

  useEffect(() => {
    setWinner(event?.winnerMovie ?? null);
  }, [event?.winnerMovie]);

  const launch = useCallback(() => {
    setError(null);
    setLoading(true);
    postEventWheel(slug, hostToken)
      .then((res) => {
        const idx = safeMovies.findIndex((m) => m.id === res.winner.id);
        setWinner(res.winner);
        setWinnerIndex(Math.max(idx, 0));
        setWheelKey((k) => k + 1);
        setIsModalOpen(true);
        track('movie_picked');
      })
      .catch((err) => setError(getErrorMessage(err, t('events.wheel.launchError'))))
      .finally(() => setLoading(false));
  }, [slug, hostToken, safeMovies, track, t]);

  const reset = useCallback(() => {
    setError(null);
    setLoading(true);
    deleteEventWheel(slug, hostToken)
      .then(() => {
        setWinner(null);
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
    canSpin: isOpenForActions,
    spinDisabled: moviesCount === 0,
    showRelaunch: isOpenForActions && !!winner && moviesCount > 0,
    showReset: isOpenForActions && !!winner,
    showClose: isOpenForActions && (!!winner || !!event?.closedAt),
    launch,
    reset,
    closeEvent,
    dismissModal,
  };
}
