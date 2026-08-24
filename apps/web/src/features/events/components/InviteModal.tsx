import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '@/shared/components/Avatar';
import DialogTitleBar from '@/shared/components/DialogTitleBar';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { ROUTES } from '@/app/routes';
import {
  getEligibleFollows,
  sendEventInvitation,
  type EligibleFollowItem,
} from '@/features/events/api/eventsApi';
import styles from './InviteModal.module.css';

type Props = {
  open: boolean;
  slug: string;
  onClose: () => void;
};

export default function InviteModal({ open, slug, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const dialogRef = useModalDialog(open, onClose);
  const titleId = useId();
  const queryClient = useQueryClient();

  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [itemError, setItemError] = useState<string | null>(null);

  const followsQuery = useQuery({
    queryKey: queryKeys.event.eligibleFollows(slug),
    queryFn: () => getEligibleFollows(slug),
    enabled: open,
    staleTime: 30_000,
  });

  const inviteMutation = useMutation({
    mutationFn: (targetUserId: string) => sendEventInvitation(slug, targetUserId),
    onSuccess: (_data, targetUserId) => {
      setInvitedIds((prev) => new Set(prev).add(targetUserId));
      setItemError(null);
      track('invitation_sent');
      queryClient.invalidateQueries({ queryKey: queryKeys.event.eligibleFollows(slug) });
    },
    onError: (err) => {
      setItemError(getErrorMessage(err, t('events.invite.inviteError')));
    },
  });

  useEffect(() => {
    if (!open) return;
    setInvitedIds(new Set());
    setItemError(null);
  }, [open]);

  const handleInvite = (item: EligibleFollowItem) => {
    if (inviteMutation.isPending) return;
    setItemError(null);
    inviteMutation.mutate(item.userId);
  };

  const follows = followsQuery.data?.follows ?? [];

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <DialogTitleBar
        titleId={titleId}
        title={t('events.invite.modalTitle')}
        onClose={onClose}
        closeLabel={t('common.close')}
      />

      <div className={styles.body}>
        {followsQuery.isPending && <p className={styles.loadingState}>{t('common.loading')}</p>}

        {followsQuery.isError && (
          <p className={styles.errorState}>{t('events.invite.loadError')}</p>
        )}

        {!followsQuery.isPending && !followsQuery.isError && follows.length === 0 && (
          <div className={styles.emptyState}>
            <p>{t('events.invite.emptyLine1')}</p>
            {user?.handle && (
              <p>
                <Link
                  to={ROUTES.profile(user.handle)}
                  onClick={onClose}
                  className={styles.emptyLink}
                >
                  {t('events.invite.emptyLink')}
                </Link>
              </p>
            )}
          </div>
        )}

        {follows.length > 0 && (
          <>
            {itemError && (
              <p className="error" role="alert" style={{ margin: '0.5rem 1.25rem' }}>
                {itemError}
              </p>
            )}
            <ul className={styles.list}>
              {follows.map((item) => {
                const isInvited = item.isAlreadyInvited || invitedIds.has(item.userId);
                const isParticipant = item.isAlreadyParticipant;
                const isBusy = inviteMutation.isPending && inviteMutation.variables === item.userId;

                const inviteAction = isInvited ? (
                  <span className={`${styles.badge} ${styles.badgeInvited}`}>
                    {t('events.invite.invitedBadge')}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => handleInvite(item)}
                    disabled={isBusy}
                    aria-label={t('events.invite.inviteAriaLabel', { name: item.displayName })}
                  >
                    {isBusy ? '…' : t('events.invite.inviteAction')}
                  </button>
                );

                return (
                  <li
                    key={item.userId}
                    className={`${styles.item} ${isParticipant ? styles.itemDisabled : ''}`}
                  >
                    <Avatar avatarId={item.avatarId} pseudo={item.displayName} size="sm" />
                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>{item.displayName}</div>
                      <div className={styles.itemHandle}>@{item.handle}</div>
                    </div>

                    {isParticipant ? (
                      <span className={`${styles.badge} ${styles.badgeParticipant}`}>
                        {t('events.invite.alreadyParticipant')}
                      </span>
                    ) : (
                      inviteAction
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </dialog>
  );
}
