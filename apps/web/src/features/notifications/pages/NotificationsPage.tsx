import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Inbox } from 'lucide-react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '@/shared/components/Avatar';
import EmptyState from '@/shared/components/EmptyState';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useAuth } from '@/features/auth/contexts/AuthContext';
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

const NOTIFICATION_TEXT_KEYS = {
  newfollower: { plain: 'notifications.newFollowerText' },
  participantjoined: {
    plain: 'notifications.participantJoinedText',
    grouped: 'notifications.participantJoinedGroupedText',
  },
  movieadded: {
    plain: 'notifications.movieAddedText',
    grouped: 'notifications.movieAddedGroupedText',
  },
  moviepicked: {
    plain: 'notifications.moviePickedText',
    grouped: 'notifications.moviePickedGroupedText',
  },
  moviepickedmanually: {
    plain: 'notifications.moviePickedManuallyText',
    grouped: 'notifications.moviePickedManuallyGroupedText',
  },
  eventdeleted: {
    plain: 'notifications.eventDeletedText',
    grouped: 'notifications.eventDeletedGroupedText',
  },
  eventdatechanged: {
    plain: 'notifications.eventDateChangedText',
    grouped: 'notifications.eventDateChangedGroupedText',
  },
  eventreminder1h: {
    plain: 'notifications.eventReminder1hText',
    grouped: 'notifications.eventReminder1hGroupedText',
  },
  eventreminder24h: {
    plain: 'notifications.eventReminder24hText',
    grouped: 'notifications.eventReminder24hGroupedText',
  },
  eventinvitation: { plain: 'notifications.eventInvitationText' },
  eventpending: {
    plain: 'notifications.eventPendingText',
    grouped: 'notifications.eventPendingGroupedText',
  },
  letterboxdreconciliationpending: {
    plain: 'notifications.letterboxdReconciliationPendingText',
  },
} as const satisfies Partial<
  Record<UserNotificationItem['type'], { plain: TranslationKey; grouped?: TranslationKey }>
>;

function notifText(item: UserNotificationItem, t: TFn, withinEventGroup = false): string {
  const keys = NOTIFICATION_TEXT_KEYS[item.type as keyof typeof NOTIFICATION_TEXT_KEYS] as
    { plain: TranslationKey; grouped?: TranslationKey } | undefined;
  if (!keys) return '';

  const key = withinEventGroup ? (keys.grouped ?? keys.plain) : keys.plain;
  return t(key, {
    name: item.actorDisplayName ?? '',
    movie: item.movieTitle ?? '',
    eventTitle: item.eventTitle ?? '',
  });
}

function NotifRow({
  item,
  t,
  locale,
  onRead,
  withinEventGroup = false,
}: Readonly<{
  item: UserNotificationItem;
  t: TFn;
  locale: LocaleCode;
  onRead: (id: string) => void;
  withinEventGroup?: boolean;
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
        <p className={styles.itemText}>{renderWithBold(notifText(item, t, withinEventGroup))}</p>
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
    const readSingle = (id: string) => {
      onRead(id);
      for (const supersededId of group.supersededIds) onRead(supersededId);
    };
    return (
      <div className={styles.card}>
        <NotifRow item={group.item} t={t} locale={locale} onRead={readSingle} />
      </div>
    );
  }

  const visible = expanded ? group.items : group.items.slice(0, GROUP_PREVIEW_COUNT);
  const hidden = group.items.length - visible.length;

  return (
    <div className={styles.card}>
      <p className={styles.cardHead}>{group.eventTitle}</p>
      {visible.map((item) => (
        <NotifRow
          key={item.id}
          item={item}
          t={t}
          locale={locale}
          onRead={onRead}
          withinEventGroup
        />
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
  useNoindexPage(pageTitle(t('notifications.inboxTitle')), ROUTES.notifications);
  const { user, isLoading: authLoading } = useAuth();
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
    enabled: !authLoading && !!user,
  });

  const invalidateInbox = useCallback(() => {
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

  if (authLoading) {
    return (
      <PageLayout>
        <h1 className="visually-hidden">{t('notifications.inboxTitle')}</h1>
        <p className="placeholder">{t('common.loading')}</p>
      </PageLayout>
    );
  }

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
