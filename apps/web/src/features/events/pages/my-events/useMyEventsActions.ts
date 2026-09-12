import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  deleteEvent,
  postEventClose,
  removeEventParticipant,
} from '@/features/events/api/eventsApi';
import { getStoredParticipant, removeStoredParticipant } from '@/features/events/storage';
import { getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useAnalytics } from '@/shared/hooks/useAnalytics';

export function useMyEventsActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { track } = useAnalytics();

  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<{ slug: string; participantId: string } | null>(
    null
  );
  const [confirmHistoryRemove, setConfirmHistoryRemove] = useState<{
    slug: string;
    participantId: string;
    title: string;
  } | null>(null);
  const [confirmClose, setConfirmClose] = useState<{ slug: string; title: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [historyRemoveError, setHistoryRemoveError] = useState<string | null>(null);
  const invalidateMyEvents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
  }, [queryClient]);
  const deleteMutation = useMutation({
    mutationFn: (slug: string) => deleteEvent(slug),
    onSuccess: () => {
      invalidateMyEvents();
      setDeleteError(null);
      track('event_deleted');
    },
    onError: (e) => {
      setDeleteError(getErrorMessage(e, t('events.danger.deleteError')));
    },
    onSettled: () => {
      setConfirmDeleteSlug(null);
    },
  });
  const leaveMutation = useMutation({
    mutationFn: ({ slug, participantId }: { slug: string; participantId: string }) =>
      removeEventParticipant(slug, participantId, null),
    onSuccess: (_, { slug }) => {
      removeStoredParticipant(slug);
      invalidateMyEvents();
      setLeaveError(null);
      track('event_left');
    },
    onError: (e) => {
      setLeaveError(getErrorMessage(e, t('events.participants.leaveError')));
    },
    onSettled: () => {
      setConfirmLeave(null);
    },
  });
  const historyRemoveMutation = useMutation({
    mutationFn: ({ slug, participantId }: { slug: string; participantId: string }) =>
      removeEventParticipant(slug, participantId, null),
    onSuccess: (_, { slug }) => {
      removeStoredParticipant(slug);
      invalidateMyEvents();
      setHistoryRemoveError(null);
    },
    onError: (e) => {
      setHistoryRemoveError(getErrorMessage(e, t('events.myEvents.historyRemoveError')));
    },
    onSettled: () => {
      setConfirmHistoryRemove(null);
    },
  });
  const closeMutation = useMutation({
    mutationFn: (slug: string) => postEventClose(slug, null),
    onSuccess: () => {
      invalidateMyEvents();
      setCloseError(null);
    },
    onError: (e) => {
      setCloseError(getErrorMessage(e, t('events.wheel.closeError')));
    },
    onSettled: () => {
      setConfirmClose(null);
    },
  });
  const handleLeaveEvent = useCallback(
    (slug: string) => {
      const stored = getStoredParticipant(slug);
      if (!stored) {
        navigate(ROUTES.eventDetail(slug));
        return;
      }
      setLeaveError(null);
      setConfirmLeave({ slug, participantId: stored.participantId });
    },
    [navigate]
  );

  const handleReuseEvent = useCallback(
    (slug: string, title: string) => {
      navigate(ROUTES.createEvent, { state: { reuseEventSlug: slug, reuseEventTitle: title } });
    },
    [navigate]
  );

  const handleHistoryRemove = useCallback(
    (slug: string, title: string) => {
      const stored = getStoredParticipant(slug);
      if (!stored) {
        navigate(ROUTES.eventDetail(slug));
        return;
      }
      setHistoryRemoveError(null);
      setConfirmHistoryRemove({ slug, participantId: stored.participantId, title });
    },
    [navigate]
  );

  const handleDeleteEvent = useCallback((slug: string) => {
    setDeleteError(null);
    setConfirmDeleteSlug(slug);
  }, []);

  const handleCloseWithoutMovie = useCallback((slug: string, title: string) => {
    setCloseError(null);
    setConfirmClose({ slug, title });
  }, []);

  return {
    confirmDeleteSlug,
    setConfirmDeleteSlug,
    confirmLeave,
    setConfirmLeave,
    confirmHistoryRemove,
    setConfirmHistoryRemove,
    confirmClose,
    setConfirmClose,
    deleteError,
    leaveError,
    closeError,
    historyRemoveError,
    deleteMutation,
    leaveMutation,
    closeMutation,
    historyRemoveMutation,
    handleLeaveEvent,
    handleHistoryRemove,
    handleReuseEvent,
    handleDeleteEvent,
    handleCloseWithoutMovie,
    setDeleteError,
    setLeaveError,
    setCloseError,
    setHistoryRemoveError,
  };
}

export type MyEventsActions = ReturnType<typeof useMyEventsActions>;
