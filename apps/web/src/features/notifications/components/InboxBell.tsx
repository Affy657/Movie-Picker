import { Link } from 'react-router';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Tooltip from '@/shared/components/Tooltip';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { fetchNotificationInbox } from '@/features/notifications/api/notificationsApi';
import styles from './InboxBell.module.css';

export default function InboxBell() {
  const { t } = useTranslation();

  const inboxQuery = useQuery({
    queryKey: queryKeys.notifications.inbox,
    queryFn: () => fetchNotificationInbox(),
    refetchInterval: 60_000,
  });

  const unreadCount = inboxQuery.data?.unreadCount ?? 0;
  const displayCount = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <Tooltip label={t('notifications.inboxAriaLabel')} placement="bottom">
      <Link
        to={ROUTES.notifications}
        className={styles.bellButton}
        aria-label={
          unreadCount > 0
            ? t('notifications.inboxAriaLabelWithCount', { count: displayCount })
            : t('notifications.inboxAriaLabel')
        }
      >
        <Bell size={20} aria-hidden />
        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden>
            {displayCount}
          </span>
        )}
      </Link>
    </Tooltip>
  );
}
