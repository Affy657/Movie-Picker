import { useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router';
import { Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEvent } from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
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
};

export default function HostEventDangerZone({
  slug,
  hostToken,
  eventTitle,
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
      navigate(ROUTES.myEvents);
    },
    onError: (e) => {
      setDeleteError(getErrorMessage(e, t('events.danger.deleteError')));
    },
    onSettled: () => {
      setConfirmDeleteOpen(false);
    },
  });

  return (
    <>
      <div className={styles.dangerSection} data-testid="host-danger-zone">
        <h3 className={clsx(styles.sectionTitle, styles.dangerTitle)}>
          {t('events.danger.sectionTitle')}
        </h3>
        <p className={styles.dangerLead}>{t('events.danger.sectionDescription')}</p>
        {deleteError && (
          <p className="error" role="alert">
            {deleteError}
          </p>
        )}
        <Button
          type="button"
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
          <span>
            {deleteMutation.isPending
              ? t('events.danger.deleting')
              : t('events.danger.deleteButton')}
          </span>
        </Button>
      </div>
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
    </>
  );
}
