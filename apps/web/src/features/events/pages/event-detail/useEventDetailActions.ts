import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/routes';
import { removeEventParticipant, postEventClose } from '@/features/events/api/eventsApi';
import { removeMovieFromEvent } from '@/features/movies/api/moviesApi';
import { removeStoredParticipant } from '@/shared/utils/eventIdentityStorage';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import type { MovieData } from '@/shared/types/movie';
import { buildConfirmDialogContent } from './eventDetailConfirmContent';
import type {
  ConfirmBusyByKind,
  ConfirmState,
  ParticipantRef,
  WheelApi,
} from './eventDetailSessionTypes';

const SUCCESS_AUTO_DISMISS_MS = 3500;

type EventDetailActionsInput = {
  slug: string;
  hostToken: string | null;
  eventTitle: string;
  participant: ParticipantRef | null;
  setParticipant: Dispatch<SetStateAction<ParticipantRef | null>>;
  setActionError: Dispatch<SetStateAction<string | null>>;
  refreshAll: () => void;
  wheel: WheelApi;
};

export function useEventDetailActions({
  slug,
  hostToken,
  eventTitle,
  participant,
  setParticipant,
  setActionError,
  refreshAll,
  wheel,
}: EventDetailActionsInput) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { track } = useAnalytics();

  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!actionSuccess) return;
    const id = globalThis.setTimeout(() => setActionSuccess(null), SUCCESS_AUTO_DISMISS_MS);
    return () => globalThis.clearTimeout(id);
  }, [actionSuccess]);

  const removeParticipantMutation = useMutation({
    mutationFn: (variables: { participantId: string }) =>
      removeEventParticipant(slug, variables.participantId, hostToken),
    onMutate: ({ participantId }) => {
      setPendingRemovalId(participantId);
    },
    onSettled: () => {
      setPendingRemovalId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
      queryClient.invalidateQueries({ queryKey: queryKeys.movies.list(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
    },
  });

  const removeMovieMutation = useMutation({
    mutationFn: (movieId: string) => {
      if (!participant) return Promise.reject(new Error('No participant'));
      return removeMovieFromEvent(slug, movieId, participant.participantId, hostToken);
    },
  });

  const closeWithoutMovieMutation = useMutation({
    mutationFn: () => postEventClose(slug, hostToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
      refreshAll();
    },
    onError: (err) => {
      setActionError(getErrorMessage(err, t('events.wheel.closeError')));
    },
    onSettled: () => {
      setConfirmState(null);
    },
  });
  const removeParticipant = removeParticipantMutation.mutate;
  const removeMovie = removeMovieMutation.mutate;
  const closeWithoutMovie = closeWithoutMovieMutation.mutate;
  const resetWheel = wheel.reset;

  const handleRemoveParticipant = useCallback((participantId: string, pseudo: string) => {
    setConfirmState({ kind: 'remove', participantId, pseudo });
  }, []);

  const handleRequestRemoveMovie = useCallback((movie: MovieData) => {
    setConfirmState({
      kind: 'removeMovie',
      movieId: movie.id,
      movieTitle: movie.title,
      voteCount: movie.up + movie.down,
    });
  }, []);

  const handleLeaveEvent = useCallback(() => {
    if (!participant) return;
    setConfirmState({ kind: 'leave' });
  }, [participant]);

  const closeConfirm = useCallback(() => {
    setConfirmState(null);
  }, []);

  const confirmRemove = useCallback(
    (participantId: string, pseudo: string) => {
      setActionError(null);
      removeParticipant(
        { participantId },
        {
          onSuccess: () => {
            setActionSuccess(t('events.participants.removeSuccess', { pseudo }));
          },
          onError: (err) => {
            setActionError(getErrorMessage(err, t('events.participants.removeError')));
          },
          onSettled: () => {
            setConfirmState(null);
          },
        }
      );
    },
    [removeParticipant, setActionError, t]
  );

  const confirmRemoveMovie = useCallback(
    (movieId: string) => {
      if (!participant) return;
      setActionError(null);
      removeMovie(movieId, {
        onSuccess: () => {
          track('movie_removed');
          refreshAll();
        },
        onError: (err) => {
          setActionError(getErrorMessage(err, t('movies.list.removeError')));
        },
        onSettled: () => {
          setConfirmState(null);
        },
      });
    },
    [participant, removeMovie, setActionError, track, refreshAll, t]
  );

  const confirmLeave = useCallback(() => {
    if (!participant) return;
    setActionError(null);

    removeParticipant(
      { participantId: participant.participantId },
      {
        onSuccess: () => {
          removeStoredParticipant(slug);
          setParticipant(null);
          navigate(ROUTES.myEvents);
        },
        onError: (err) => {
          setActionError(getErrorMessage(err, t('events.participants.leaveError')));
        },
        onSettled: () => {
          setConfirmState(null);
        },
      }
    );
  }, [slug, participant, removeParticipant, setActionError, setParticipant, navigate, t]);

  const [resetWheelRequested, setResetWheelRequested] = useState(false);

  const confirmResetWheel = useCallback(() => {
    setResetWheelRequested(true);
    resetWheel();
  }, [resetWheel]);

  useEffect(() => {
    if (resetWheelRequested && !wheel.loading) {
      setResetWheelRequested(false);
      setConfirmState(null);
    }
  }, [resetWheelRequested, wheel.loading]);

  const confirmCloseWithoutMovie = useCallback(() => {
    setActionError(null);
    closeWithoutMovie();
  }, [closeWithoutMovie, setActionError]);

  const confirmBusyByKind: ConfirmBusyByKind = useMemo(
    () => ({
      remove: removeParticipantMutation.isPending,
      leave: removeParticipantMutation.isPending,
      resetWheel: wheel.loading,
      removeMovie: removeMovieMutation.isPending,
      closeWithoutMovie: closeWithoutMovieMutation.isPending,
    }),
    [
      removeParticipantMutation.isPending,
      wheel.loading,
      removeMovieMutation.isPending,
      closeWithoutMovieMutation.isPending,
    ]
  );

  const confirmDialogContent = useMemo(
    () =>
      buildConfirmDialogContent({
        confirmState,
        t,
        eventTitle,
        confirmRemove,
        confirmLeave,
        confirmResetWheel,
        confirmRemoveMovie,
        confirmCloseWithoutMovie,
        busyByKind: confirmBusyByKind,
      }),
    [
      confirmState,
      t,
      eventTitle,
      confirmRemove,
      confirmLeave,
      confirmResetWheel,
      confirmRemoveMovie,
      confirmCloseWithoutMovie,
      confirmBusyByKind,
    ]
  );

  const requestResetWheel = useCallback(() => setConfirmState({ kind: 'resetWheel' }), []);
  const requestCloseWithoutMovie = useCallback(
    () => setConfirmState({ kind: 'closeWithoutMovie' }),
    []
  );

  return {
    confirmDialogContent,
    closeConfirm,
    pendingRemovalId,
    removePending: removeParticipantMutation.isPending,
    actionSuccess,
    handleRemoveParticipant,
    handleRequestRemoveMovie,
    handleLeaveEvent,
    requestResetWheel,
    requestCloseWithoutMovie,
  };
}
