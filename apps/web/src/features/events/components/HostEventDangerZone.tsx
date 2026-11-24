import { useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router';
import { Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEvent } from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import { invalidateMyNights } from '@/shared/api/invalidateMyNights';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { ROUTES } from '@/app/routes';
import { clearStoredHostToken, removeStoredParticipant } from '@/shared/utils/eventIdentityStorage';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import styles from './HostEventSettingsPanel.module.css';

type HostEventDangerZoneProps = {
  slug: string;
  hostToken: string | null;
  eventTitle: string;
  className?: string;
};

export default function HostEventDangerZone({
  slug,
  hostToken,
  eventTitle,
  className,
}: Readonly<HostEventDangerZoneProps>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(slug),
    onSuccess: async () => {
      removeStoredParticipant(slug);
      clearStoredHostToken(slug);
      queryClient.removeQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
      await invalidateMyNights(queryClient);
      void navigate(ROUTES.myEvents);
    },
    onError: (e) => {
      setDeleteError(getErrorMessage(e, t('events.danger.deleteError')));
    },
    onSettled: () => {
      setConfirmDeleteOpen(false);
    },
  });

  return (
    <div className={clsx(styles.danger, className)} data-testid="host-danger-zone">
      {deleteError && (
        <p className={clsx('error', styles.dangerError)} role="alert">
          {deleteError}
        </p>
      )}
      <Button
        type="button"
        variant="ghost"
        tone="danger"
        className={styles.deleteBtn}
        onClick={() => {
          setDeleteError(null);
          setConfirmDeleteOpen(true);
        }}
        disabled={deleteMutation.isPending}
        data-testid="delete-event-button"
      >
        <Trash2 size={ICON_SIZE.md} aria-hidden />
        {deleteMutation.isPending ? t('events.danger.deleting') : t('events.danger.deleteButton')}
      </Button>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t('events.danger.deleteConfirmTitle')}
        message={t('events.danger.deleteConfirmMessage', { title: eventTitle })}
        confirmLabel={t('events.danger.deleteConfirmAction')}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDeleteOpen(false)}
        testId="delete-event-confirm-dialog"
      />
    </div>
  );
}
