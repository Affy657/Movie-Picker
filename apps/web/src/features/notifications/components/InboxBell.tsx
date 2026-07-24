import { useCallback, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Bell, Inbox } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '@/shared/components/Avatar';
import EmptyState from '@/shared/components/EmptyState';
import Tooltip from '@/shared/components/Tooltip';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useMenuFocus } from '@/shared/hooks/useMenuFocus';
import { getErrorMessage } from '@/shared/api/apiError';
import {
  fetchNotificationInbox,
  markAllNotificationsRead,
  type UserNotificationItem,
} from '@/features/notifications/api/notificationsApi';
import type { TranslationKey } from '@/shared/i18n';
import styles from './InboxBell.module.css';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

function NotifLinkWithAvatar({
  eventSlug,
  onClose,
  avatarId,
  pseudo,
  children,
}: Readonly<{
  eventSlug: string;
  onClose: () => void;
  avatarId?: string | null;
  pseudo?: string | null;
  children: React.ReactNode;
}>) {
  return (
    <Link to={ROUTES.eventDetail(eventSlug)} className={styles.notifLink} onClick={onClose}>
      <Avatar avatarId={avatarId ?? undefined} pseudo={pseudo ?? undefined} size="xs" />
      <span className={styles.notifText}>{children}</span>
    </Link>
  );
}

function renderNotifContent(
  item: UserNotificationItem,
  onClose: () => void,
  t: TFn
): React.ReactNode | null {
  if (item.type === 'newfollower' && item.actorHandle) {
    return (
      <Link to={ROUTES.profile(item.actorHandle)} className={styles.notifLink} onClick={onClose}>
        <Avatar
          avatarId={item.actorAvatarId ?? undefined}
          pseudo={item.actorDisplayName ?? undefined}
          size="xs"
        />
        <span className={styles.notifText}>
          <strong>{item.actorDisplayName}</strong> {t('notifications.newFollowerText')}
        </span>
      </Link>
    );
  }

  if (item.type === 'participantjoined' && item.eventSlug) {
    return (
      <NotifLinkWithAvatar
        eventSlug={item.eventSlug}
        onClose={onClose}
        avatarId={item.actorAvatarId}
        pseudo={item.actorDisplayName}
      >
        <strong>{item.eventTitle}</strong>{' '}
        {t('notifications.participantJoinedText', { name: item.actorDisplayName ?? '—' })}
      </NotifLinkWithAvatar>
    );
  }

  if (item.type === 'movieadded' && item.eventSlug) {
    return (
      <NotifLinkWithAvatar
        eventSlug={item.eventSlug}
        onClose={onClose}
        avatarId={item.actorAvatarId}
        pseudo={item.actorDisplayName}
      >
        <strong>{item.eventTitle}</strong>{' '}
        {t('notifications.movieAddedText', { movie: item.movieTitle ?? '—' })}
      </NotifLinkWithAvatar>
    );
  }

  if (item.type === 'moviepicked' && item.eventSlug) {
    return (
      <Link to={ROUTES.eventDetail(item.eventSlug)} className={styles.notifLink} onClick={onClose}>
        <span className={styles.notifText}>
          <strong>{item.eventTitle}</strong>{' '}
          {t('notifications.moviePickedText', { movie: item.movieTitle ?? '—' })}
        </span>
      </Link>
    );
  }

  if (item.type === 'eventdeleted') {
    return (
      <span className={styles.notifText}>
        <strong>{item.eventTitle}</strong> {t('notifications.eventDeletedText')}
      </span>
    );
  }

  if ((item.type === 'eventreminder1h' || item.type === 'eventreminder24h') && item.eventSlug) {
    const text =
      item.type === 'eventreminder1h'
        ? t('notifications.eventReminder1hText')
        : t('notifications.eventReminder24hText');
    return (
      <Link to={ROUTES.eventDetail(item.eventSlug)} className={styles.notifLink} onClick={onClose}>
        <span className={styles.notifText}>
          <strong>{item.eventTitle}</strong> {text}
        </span>
      </Link>
    );
  }

  if (item.type === 'eventinvitation' && item.eventSlug) {
    return (
      <NotifLinkWithAvatar
        eventSlug={item.eventSlug}
        onClose={onClose}
        avatarId={item.actorAvatarId}
        pseudo={item.actorDisplayName}
      >
        <strong>{item.actorDisplayName}</strong> {t('notifications.eventInvitationText')}{' '}
        <strong>{item.eventTitle}</strong>
      </NotifLinkWithAvatar>
    );
  }

  return null;
}

export default function InboxBell() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [markReadError, setMarkReadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const inboxQuery = useQuery({
    queryKey: queryKeys.notifications.inbox,
    queryFn: fetchNotificationInbox,
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      setMarkReadError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox });
    },
    onError: (err) => setMarkReadError(getErrorMessage(err, t('notifications.markReadError'))),
  });

  const unreadCount = inboxQuery.data?.unreadCount ?? 0;
  const displayCount = unreadCount > 9 ? '9+' : String(unreadCount);
  const items = inboxQuery.data?.items ?? [];

  const handleClose = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, handleClose, open);
  useMenuFocus(open, panelRef, triggerRef);

  const handleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next && unreadCount > 0) {
        markReadMutation.mutate();
      }
      return next;
    });
  };

  return (
    <div ref={containerRef} className={styles.container}>
      <Tooltip label={t('notifications.inboxAriaLabel')} placement="bottom" disabled={open}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.bellButton}
          onClick={handleOpen}
          aria-label={
            unreadCount > 0
              ? t('notifications.inboxAriaLabelWithCount', { count: displayCount })
              : t('notifications.inboxAriaLabel')
          }
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
        >
          <Bell size={20} aria-hidden />
          {unreadCount > 0 && (
            <span className={styles.badge} aria-hidden>
              {displayCount}
            </span>
          )}
        </button>
      </Tooltip>

      {open && (
        <div
          ref={panelRef}
          id={menuId}
          className={styles.dropdown}
          tabIndex={-1}
          aria-label={t('notifications.inboxTitle')}
        >
          <p className={styles.dropdownTitle}>{t('notifications.inboxTitle')}</p>
          {markReadError && (
            <p className="error" role="alert">
              {markReadError}
            </p>
          )}
          {items.length === 0 ? (
            <EmptyState
              compact
              icon={<Inbox size={22} aria-hidden />}
              message={t('notifications.inboxEmpty')}
            />
          ) : (
            <ul className={styles.list}>
              {items.slice(0, 10).map((item) => {
                const content = renderNotifContent(item, handleClose, t);
                if (!content) return null;
                return (
                  <li key={item.id} className={item.isRead ? styles.readItem : styles.unreadItem}>
                    {content}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
