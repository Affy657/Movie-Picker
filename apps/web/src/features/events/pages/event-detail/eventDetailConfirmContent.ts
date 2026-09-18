import type { Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { ConfirmBusyByKind, ConfirmState } from './eventDetailSessionTypes';

type ConfirmDialogInputs = {
  confirmState: ConfirmState;
  t: Translate;
  eventTitle: string;
  confirmRemove: (participantId: string, pseudo: string) => void;
  confirmLeave: () => void;
  confirmResetWheel: () => void;
  confirmRemoveMovie: (movieId: string) => void;
  confirmCloseWithoutMovie: () => void;
  busyByKind: ConfirmBusyByKind;
};

export function buildConfirmDialogContent({
  confirmState,
  t,
  eventTitle,
  confirmRemove,
  confirmLeave,
  confirmResetWheel,
  confirmRemoveMovie,
  confirmCloseWithoutMovie,
  busyByKind,
}: ConfirmDialogInputs) {
  if (!confirmState) return null;
  const loading = busyByKind[confirmState.kind];
  if (confirmState.kind === 'remove') {
    return {
      title: t('events.participants.removeConfirmTitle'),
      message: t('events.participants.removeConfirm', { pseudo: confirmState.pseudo }),
      confirmLabel: t('events.participants.removeConfirmAction'),
      onConfirm: () => confirmRemove(confirmState.participantId, confirmState.pseudo),
      loading,
    };
  }
  if (confirmState.kind === 'resetWheel') {
    return {
      title: t('events.wheel.resetConfirmTitle'),
      message: t('events.wheel.resetConfirmMessage'),
      confirmLabel: t('events.wheel.resetConfirmAction'),
      onConfirm: confirmResetWheel,
      loading,
    };
  }
  if (confirmState.kind === 'removeMovie') {
    return {
      title: t('movies.list.removeConfirmTitle'),
      message: pluralizeCount(
        confirmState.voteCount,
        'movies.list.removeConfirmMessageOne',
        'movies.list.removeConfirmMessage',
        t,
        { title: confirmState.movieTitle }
      ),
      confirmLabel: t('movies.list.removeConfirmAction'),
      onConfirm: () => confirmRemoveMovie(confirmState.movieId),
      loading,
    };
  }
  if (confirmState.kind === 'closeWithoutMovie') {
    return {
      title: t('events.wheel.closeWithoutMovieConfirmTitle'),
      message: t('events.wheel.closeWithoutMovieConfirmMessage', { title: eventTitle }),
      confirmLabel: t('events.wheel.closeWithoutMovieConfirmAction'),
      onConfirm: confirmCloseWithoutMovie,
      loading,
    };
  }
  return {
    title: t('events.participants.leaveConfirmTitle'),
    message: t('events.participants.leaveConfirm'),
    confirmLabel: t('events.participants.leaveConfirmAction'),
    onConfirm: confirmLeave,
    loading,
  };
}
