import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Inbox } from 'lucide-react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '@/shared/components/Avatar';
import EmptyState from '@/shared/components/EmptyState';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useLocale, useTranslation, type TranslationKey } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import { getErrorMessage } from '@/shared/api/apiError';
import { renderWithBold } from '@/shared/utils/renderWithBold';
import { formatRelativeTime } from '@/shared/utils/formatRelativeTime';
import {
  fetchNotificationInbox,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotificationItem,
} from '@/features/notifications/api/notificationsApi';
import { notifIcon } from '@/features/notifications/utils/notifIcon';
import { groupInboxItems, type InboxGroup } from '@/features/notifications/utils/groupInboxItems';
import styles from './NotificationsPage.module.css';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

const GROUP_PREVIEW_COUNT = 3;

function notifDestination(item: UserNotificationItem): string | null {
  if (item.type === 'newfollower')
    return item.actorHandle ? ROUTES.profile(item.actorHandle) : null;
  if (item.type === 'eventdeleted') return null;
  if (item.type === 'letterboxdreconciliationpending') return ROUTES.account;
  return item.eventSlug ? ROUTES.eventDetail(item.eventSlug) : null;
}

function notifText(item: UserNotificationItem, t: TFn): string {
  const eventTitle = item.eventTitle ?? '';
  const name = item.actorDisplayName ?? '';
  const movie = item.movieTitle ?? '';
  switch (item.type) {
    case 'newfollower':
      return t('notifications.newFollowerText', { name });
    case 'participantjoined':
      return t('notifications.participantJoinedText', { name, eventTitle });
    case 'movieadded':
      return t('notifications.movieAddedText', { movie, eventTitle });
    case 'moviepicked':
      return t('notifications.moviePickedText', { movie, eventTitle });
    case 'moviepickedmanually':
      return t('notifications.moviePickedManuallyText', { movie, eventTitle });
    case 'eventdeleted':
      return t('notifications.eventDeletedText', { eventTitle });
    case 'eventreminder1h':
      return t('notifications.eventReminder1hText', { eventTitle });
    case 'eventreminder24h':
      return t('notifications.eventReminder24hText', { eventTitle });
    case 'eventinvitation':
      return t('notifications.eventInvitationText', { name, eventTitle });
    case 'eventpending':
      return t('notifications.eventPendingText', { eventTitle });
    case 'letterboxdreconciliationpending':
      return t('notifications.letterboxdReconciliationPendingText');
    default:
      return '';
  }
}

function NotifRow({
  item,
  t,
  locale,
  onRead,
}: Readonly<{
  item: UserNotificationItem;
  t: TFn;
  locale: LocaleCode;
  onRead: (id: string) => void;
}>) {
  const to = notifDestination(item);
  const hasActor = !!item.actorDisplayName;
  const rowClassName = `${styles.item} ${item.isRead ? '' : styles.itemUnread}`;
  const content = (
    <>
      <span className={styles.itemIcon} aria-hidden>
        {hasActor ? (
          <Avatar
            avatarId={item.actorAvatarId ?? undefined}
            pseudo={item.actorDisplayName ?? undefined}
            size="xs"
          />
        ) : (
          notifIcon(item.type)
        )}
      </span>
      <span className={styles.itemBody}>
        <p className={styles.itemText}>{renderWithBold(notifText(item, t))}</p>
      </span>
      <span className={styles.itemTime}>{formatRelativeTime(item.createdAt, locale)}</span>
    </>
  );

  const handleClick = () => {
    if (!item.isRead) onRead(item.id);
  };

  if (to) {
    return (
      <Link to={to} className={rowClassName} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={rowClassName} onClick={handleClick}>
      {content}
    </button>
  );
}

function NotifCard({
  group,
  t,
  locale,
  onRead,
}: Readonly<{
  group: InboxGroup;
  t: TFn;
  locale: LocaleCode;
  onRead: (id: string) => void;
}>) {
  const [expanded, setExpanded] = useState(false);

  if (group.kind === 'single') {
    return (
      <div className={styles.card}>
        <NotifRow item={group.item} t={t} locale={locale} onRead={onRead} />
      </div>
    );
  }

  const visible = expanded ? group.items : group.items.slice(0, GROUP_PREVIEW_COUNT);
  const hidden = group.items.length - visible.length;

  return (
    <div className={styles.card}>
      <p className={styles.cardHead}>{group.eventTitle}</p>
      {visible.map((item) => (
        <NotifRow key={item.id} item={item} t={t} locale={locale} onRead={onRead} />
      ))}
      {hidden > 0 && (
        <button type="button" className={styles.seeMore} onClick={() => setExpanded(true)}>
          {t('notifications.seeMoreGroup', { count: hidden })}
        </button>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  useDocumentTitle(pageTitle(t('notifications.inboxTitle')));
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const inboxQuery = useInfiniteQuery({
    queryKey: queryKeys.notifications.inboxPaged,
    queryFn: ({ pageParam }: { pageParam: number }) => fetchNotificationInbox(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, p) => sum + p.items.length, 0);
    },
  });

  const invalidateInbox = useCallback(() => {
    // Le badge de la cloche (clé non paginée) et cette page (clé paginée) partagent le même
    // compteur de non-lus côté serveur : les deux doivent être invalidés ensemble.
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inboxPaged });
  }, [queryClient]);

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      setActionError(null);
      invalidateInbox();
    },
    onError: (err) => setActionError(getErrorMessage(err, t('notifications.markReadError'))),
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      setActionError(null);
      invalidateInbox();
    },
    onError: (err) => setActionError(getErrorMessage(err, t('notifications.markOneReadError'))),
  });

  const items = useMemo(
    () => inboxQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [inboxQuery.data]
  );
  const unreadCount = inboxQuery.data?.pages[0]?.unreadCount ?? 0;
  const groups = useMemo(() => groupInboxItems(items), [items]);
  const handleRead = useCallback((id: string) => markOneMutation.mutate(id), [markOneMutation]);

  return (
    <PageLayout>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t('notifications.inboxTitle')}</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            className={styles.markAllBtn}
            disabled={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            {t('notifications.markAllButton')}
          </button>
        )}
      </div>

      {actionError && (
        <p className="error" role="alert">
          {actionError}
        </p>
      )}

      {groups.length === 0 && !inboxQuery.isLoading ? (
        <EmptyState
          icon={<Inbox size={26} aria-hidden />}
          message={t('notifications.inboxEmpty')}
        />
      ) : (
        <div className={styles.list}>
          {groups.map((group) => (
            <NotifCard
              key={group.kind === 'event' ? group.eventSlug : group.item.id}
              group={group}
              t={t}
              locale={locale}
              onRead={handleRead}
            />
          ))}
        </div>
      )}

      {inboxQuery.hasNextPage && (
        <button
          type="button"
          className={styles.loadMoreBtn}
          disabled={inboxQuery.isFetchingNextPage}
          onClick={() => inboxQuery.fetchNextPage()}
        >
          {t('notifications.loadMoreButton')}
        </button>
      )}
    </PageLayout>
  );
}
