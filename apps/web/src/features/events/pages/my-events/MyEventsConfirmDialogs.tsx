import ConfirmDialog from '@/shared/components/ConfirmDialog';
import type { MyEventSummary } from '@/features/events/types';
import { useTranslation } from '@/shared/i18n';
import type { MyEventsActions } from './useMyEventsActions';

interface MyEventsConfirmDialogsProps {
  actions: MyEventsActions;
  historyEvents: MyEventSummary[];
}

export default function MyEventsConfirmDialogs({
  actions,
  historyEvents,
}: Readonly<MyEventsConfirmDialogsProps>) {
  const { t } = useTranslation();
  const {
    confirmDeleteSlug,
    setConfirmDeleteSlug,
    deleteMutation,
    confirmLeave,
    setConfirmLeave,
    leaveMutation,
    confirmHistoryRemove,
    setConfirmHistoryRemove,
    historyRemoveMutation,
    confirmClose,
    setConfirmClose,
    closeMutation,
    setDeleteError,
    setLeaveError,
    setHistoryRemoveError,
    setCloseError,
  } = actions;

  return (
    <>
      <ConfirmDialog
        open={confirmDeleteSlug !== null}
        title={t('events.danger.deleteConfirmTitle')}
        message={t('events.danger.deleteConfirmMessage', {
          title: historyEvents.find((e) => e.slug === confirmDeleteSlug)?.title ?? '',
        })}
        confirmLabel={t('events.danger.deleteConfirmAction')}
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (confirmDeleteSlug) deleteMutation.mutate(confirmDeleteSlug);
        }}
        onCancel={() => {
          setConfirmDeleteSlug(null);
          setDeleteError(null);
        }}
      />
      <ConfirmDialog
        open={confirmLeave !== null}
        title={t('events.participants.leaveConfirmTitle')}
        message={t('events.participants.leaveConfirm')}
        confirmLabel={t('events.participants.leaveConfirmAction')}
        loading={leaveMutation.isPending}
        onConfirm={() => {
          if (confirmLeave) leaveMutation.mutate(confirmLeave);
        }}
        onCancel={() => {
          setConfirmLeave(null);
          setLeaveError(null);
        }}
      />
      <ConfirmDialog
        open={confirmHistoryRemove !== null}
        title={t('events.myEvents.historyRemoveConfirmTitle')}
        message={t('events.myEvents.historyRemoveConfirmMessage', {
          title: confirmHistoryRemove?.title ?? '',
        })}
        confirmLabel={t('events.myEvents.historyRemoveConfirmAction')}
        loading={historyRemoveMutation.isPending}
        onConfirm={() => {
          if (confirmHistoryRemove) historyRemoveMutation.mutate(confirmHistoryRemove);
        }}
        onCancel={() => {
          setConfirmHistoryRemove(null);
          setHistoryRemoveError(null);
        }}
      />
      <ConfirmDialog
        open={confirmClose !== null}
        title={t('events.wheel.closeWithoutMovieConfirmTitle')}
        message={t('events.wheel.closeWithoutMovieConfirmMessage', {
          title: confirmClose?.title ?? '',
        })}
        confirmLabel={t('events.wheel.closeWithoutMovieConfirmAction')}
        loading={closeMutation.isPending}
        onConfirm={() => {
          if (confirmClose) closeMutation.mutate(confirmClose.slug);
        }}
        onCancel={() => {
          setConfirmClose(null);
          setCloseError(null);
        }}
      />
    </>
  );
}
