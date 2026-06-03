import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '@/shared/components/Avatar';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import {
  fetchNotificationInbox,
  markAllNotificationsRead,
} from '@/features/notifications/api/notificationsApi';
import styles from './InboxBell.module.css';

export default function InboxBell() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const inboxQuery = useQuery({
    queryKey: queryKeys.notifications.inbox,
    queryFn: fetchNotificationInbox,
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox });
    },
  });

  const unreadCount = inboxQuery.data?.unreadCount ?? 0;
  const items = inboxQuery.data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

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
      <button
        type="button"
        className={styles.bellButton}
        onClick={handleOpen}
        aria-label={t('notifications.inboxAriaLabel')}
        aria-expanded={open}
      >
        <Bell size={20} aria-hidden />
        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          <p className={styles.dropdownTitle}>{t('notifications.inboxTitle')}</p>
          {items.length === 0 ? (
            <p className={styles.empty}>{t('notifications.inboxEmpty')}</p>
          ) : (
            <ul className={styles.list}>
              {items.slice(0, 10).map((item) => (
                <li key={item.id} className={item.isRead ? styles.readItem : styles.unreadItem}>
                  {item.type === 'newfollower' && item.actorHandle ? (
                    <Link
                      to={ROUTES.profile(item.actorHandle)}
                      className={styles.notifLink}
                      onClick={() => setOpen(false)}
                    >
                      <Avatar avatarId={item.actorAvatarId ?? ''} size="xs" />
                      <span className={styles.notifText}>
                        <strong>{item.actorDisplayName}</strong>{' '}
                        {t('notifications.newFollowerText')}
                      </span>
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
