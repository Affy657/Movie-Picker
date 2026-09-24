import { Link } from 'react-router';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Tooltip from '@/shared/components/Tooltip';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { fetchNotificationInbox } from '@/features/notifications/api/notificationsApi';
import { pollIntervalAfterFailures } from '@/shared/api/retryPolicy';
import styles from './InboxBell.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import CountBadge from '@/shared/components/CountBadge';
import { iconButtonClass } from '@/shared/components/IconButton';

const INBOX_POLL_INTERVAL_MS = 60_000;

export default function InboxBell() {
  const { t } = useTranslation();

  const inboxQuery = useQuery({
    queryKey: queryKeys.notifications.inbox,
    queryFn: () => fetchNotificationInbox(),
    refetchInterval: (query) => pollIntervalAfterFailures(INBOX_POLL_INTERVAL_MS, query),
  });

  const unreadCount = inboxQuery.data?.unreadCount ?? 0;
  const displayCount = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <Tooltip label={t('notifications.inboxAriaLabel')} placement="bottom">
      <Link
        to={ROUTES.notifications}
        className={iconButtonClass()}
        aria-label={
          unreadCount > 0
            ? t('notifications.inboxAriaLabelWithCount', { count: displayCount })
            : t('notifications.inboxAriaLabel')
        }
      >
        <Bell size={ICON_SIZE.xl} aria-hidden />
        {unreadCount > 0 && (
          <CountBadge value={displayCount} size="sm" className={styles.badge} aria-hidden />
        )}
      </Link>
    </Tooltip>
  );
}
