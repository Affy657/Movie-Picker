import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Inbox } from 'lucide-react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '@/shared/components/Avatar';
import EmptyState from '@/shared/components/EmptyState';
import InlineError from '@/shared/components/InlineError';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';
import { invalidateMyNights } from '@/shared/api/invalidateMyNights';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useLocale, useTranslation, type TranslationKey, type Translate } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import { getErrorMessage } from '@/shared/api/apiError';
import { formatRelativeTime } from '@/shared/utils/formatRelativeTime';
import {
  acceptGroupInvitation,
  acceptListInvitation,
  declineGroupInvitation,
  declineListInvitation,
  fetchNotificationInbox,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotificationItem,
} from '@/features/notifications/api/notificationsApi';
import { notifIcon } from '@/features/notifications/utils/notifIcon';
import { renderNotificationText } from '@/features/notifications/utils/renderNotificationText';
import { groupInboxItems, type InboxGroup } from '@/features/notifications/utils/groupInboxItems';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import styles from './NotificationsPage.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

const GROUP_PREVIEW_COUNT = 3;

function withoutRepeatedIds(items: UserNotificationItem[]): UserNotificationItem[] {
  const seenIds = new Set<string>();
  return items.filter((item) => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
}

interface InvitationAnswer {
  item: UserNotificationItem;
  accept: boolean;
}

type AnswerInvitation = (answer: InvitationAnswer) => void;

function awaitsAnswer(item: UserNotificationItem, answered: ReadonlySet<string>): boolean {
  if (answered.has(item.id)) return false;
  if (item.type === 'listinvitation') return !!item.listInvitationPending && !!item.listId;
  if (item.type === 'groupinvitation') return !!item.groupInvitationPending && !!item.groupId;
  return false;
}

function notifDestination(item: UserNotificationItem): string | null {
  if (item.type === 'newfollower')
    return item.actorHandle ? ROUTES.profile(item.actorHandle) : null;
  if (item.type === 'listinvitation') return ROUTES.lists;
  if (item.type === 'groupinvitation') return ROUTES.groups;
  if (item.type === 'eventdeleted') return null;
  if (item.type === 'letterboxdreconciliationpending') return ROUTES.accountIntegrations;
  if (!item.eventSlug) return null;
  if (item.type === 'ratingreminder') return ROUTES.eventDetailRating(item.eventSlug);
  return ROUTES.eventDetail(item.eventSlug);
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
  listinvitation: { plain: 'notifications.listInvitationText' },
  groupinvitation: { plain: 'notifications.groupInvitationText' },
  groupnight: { plain: 'notifications.groupNightText' },
  hostrolereceived: { plain: 'notifications.hostRoleReceivedText' },
  eventpending: {
    plain: 'notifications.eventPendingText',
    grouped: 'notifications.eventPendingGroupedText',
  },
  letterboxdreconciliationpending: {
    plain: 'notifications.letterboxdReconciliationPendingText',
  },
  ratingreminder: {
    plain: 'notifications.ratingReminderText',
    grouped: 'notifications.ratingReminderGroupedText',
  },
} as const satisfies Partial<
  Record<UserNotificationItem['type'], { plain: TranslationKey; grouped?: TranslationKey }>
>;

function notifText(item: UserNotificationItem, t: Translate, withinEventGroup = false): ReactNode {
  const keys = NOTIFICATION_TEXT_KEYS[item.type as keyof typeof NOTIFICATION_TEXT_KEYS] as
    { plain: TranslationKey; grouped?: TranslationKey } | undefined;
  if (!keys) return '';

  const key = withinEventGroup ? (keys.grouped ?? keys.plain) : keys.plain;
  return renderNotificationText(t(key), {
    name: item.actorDisplayName ?? '',
    movie: item.movieTitle ?? '',
    eventTitle: item.eventTitle ?? '',
    listName: item.listName ?? '',
    groupName: item.groupName ?? '',
  });
}

function InvitationAnswers({
  item,
  t,
  pending,
  onAnswer,
}: Readonly<{
  item: UserNotificationItem;
  t: Translate;
  pending: boolean;
  onAnswer: AnswerInvitation;
}>) {
  const toGroup = item.type === 'groupinvitation';
  const name = (toGroup ? item.groupName : item.listName) ?? '';
  return (
    <span className={styles.itemAnswers}>
      <Button
        size="sm"
        variant="primary"
        disabled={pending}
        aria-label={
          toGroup
            ? t('notifications.groupInvitationAcceptAria', { groupName: name })
            : t('notifications.listInvitationAcceptAria', { listName: name })
        }
        onClick={() => onAnswer({ item, accept: true })}
      >
        {t('notifications.listInvitationAccept')}
      </Button>
      <Button
        size="sm"
        disabled={pending}
        aria-label={
          toGroup
            ? t('notifications.groupInvitationDeclineAria', { groupName: name })
            : t('notifications.listInvitationDeclineAria', { listName: name })
        }
        onClick={() => onAnswer({ item, accept: false })}
      >
        {t('notifications.listInvitationDecline')}
      </Button>
    </span>
  );
}

function NotifRow({
  item,
  t,
  locale,
  onRead,
  answers,
  withinEventGroup = false,
}: Readonly<{
  item: UserNotificationItem;
  t: Translate;
  locale: LocaleCode;
  onRead: (id: string) => void;
  answers?: InboxAnswers;
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
        <p className={styles.itemText}>{notifText(item, t, withinEventGroup)}</p>
      </span>
      <span className={styles.itemTime}>{formatRelativeTime(item.createdAt, locale)}</span>
    </>
  );

  const handleClick = () => {
    if (!item.isRead) onRead(item.id);
  };

  if (answers && awaitsAnswer(item, answers.answered)) {
    return (
      <div className={`${rowClassName} ${styles.itemWithAnswers}`}>
        {content}
        <InvitationAnswers
          item={item}
          t={t}
          pending={answers.pendingId === item.id}
          onAnswer={answers.onAnswer}
        />
      </div>
    );
  }

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

interface InboxAnswers {
  answered: ReadonlySet<string>;
  pendingId: string | null;
  onAnswer: AnswerInvitation;
}

function NotifCard({
  group,
  t,
  locale,
  onRead,
  answers,
}: Readonly<{
  group: InboxGroup;
  t: Translate;
  locale: LocaleCode;
  onRead: (id: string) => void;
  answers: InboxAnswers;
}>) {
  const [expanded, setExpanded] = useState(false);

  if (group.kind === 'single') {
    const readSingle = (id: string) => {
      onRead(id);
      for (const supersededId of group.supersededIds) onRead(supersededId);
    };
    return (
      <Card padding="none" elevation="sm" className={styles.card}>
        <NotifRow item={group.item} t={t} locale={locale} onRead={readSingle} answers={answers} />
      </Card>
    );
  }

  const visible = expanded ? group.items : group.items.slice(0, GROUP_PREVIEW_COUNT);
  const hidden = group.items.length - visible.length;

  return (
    <Card padding="none" elevation="sm" className={styles.card}>
      <p className={styles.cardHead}>
        <bdi>{group.eventTitle}</bdi>
      </p>
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
          {pluralizeCount(hidden, 'notifications.seeMoreGroupOne', 'notifications.seeMoreGroup', t)}
        </button>
      )}
    </Card>
  );
}

function InboxList({
  groups,
  loading,
  t,
  locale,
  onRead,
  answers,
}: Readonly<{
  groups: InboxGroup[];
  loading: boolean;
  t: Translate;
  locale: LocaleCode;
  onRead: (id: string) => void;
  answers: InboxAnswers;
}>) {
  if (groups.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<Inbox size={ICON_SIZE['3xl']} aria-hidden />}
        message={t('notifications.inboxEmpty')}
      />
    );
  }

  return (
    <div className={styles.list}>
      {groups.map((group) => (
        <NotifCard
          key={group.kind === 'event' ? group.eventSlug : group.item.id}
          group={group}
          t={t}
          locale={locale}
          onRead={onRead}
          answers={answers}
        />
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  useNoindexPage(pageTitle(t('notifications.inboxTitle')), ROUTES.notifications);
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);
  const [answered, setAnswered] = useState<ReadonlySet<string>>(() => new Set());

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
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox });
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inboxPaged });
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

  const answerMutation = useMutation({
    mutationFn: ({ item, accept }: InvitationAnswer) => {
      if (item.type === 'groupinvitation') {
        const groupId = item.groupId ?? '';
        return accept ? acceptGroupInvitation(groupId) : declineGroupInvitation(groupId);
      }
      const listId = item.listId ?? '';
      return accept ? acceptListInvitation(listId) : declineListInvitation(listId);
    },
    onSuccess: (_result, { item, accept }) => {
      setActionError(null);
      setAnswered((current) => new Set(current).add(item.id));
      if (!item.isRead) markOneMutation.mutate(item.id);
      invalidateInbox();
      if (item.type === 'groupinvitation') {
        void invalidateMyNights(queryClient);
        if (accept && item.groupId) void navigate(ROUTES.group(item.groupId));
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
      if (accept && item.listId) void navigate(ROUTES.list(item.listId));
    },
    onError: (err) => setActionError(getErrorMessage(err, t('notifications.listInvitationError'))),
  });
  const answers: InboxAnswers = {
    answered,
    pendingId: answerMutation.isPending ? (answerMutation.variables?.item.id ?? null) : null,
    onAnswer: (answer) => answerMutation.mutate(answer),
  };

  const items = useMemo(
    () => withoutRepeatedIds(inboxQuery.data?.pages.flatMap((p) => p.items) ?? []),
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
          <Button
            size="sm"
            className={styles.markAllBtn}
            loading={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            {t('notifications.markAllButton')}
          </Button>
        )}
      </div>

      {actionError && (
        <p className="error" role="alert">
          {actionError}
        </p>
      )}

      {inboxQuery.isError && !inboxQuery.data ? (
        <InlineError
          message={t('notifications.inboxLoadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void inboxQuery.refetch()}
        />
      ) : (
        <InboxList
          groups={groups}
          loading={inboxQuery.isLoading}
          t={t}
          locale={locale}
          onRead={handleRead}
          answers={answers}
        />
      )}

      {inboxQuery.hasNextPage && (
        <Button
          className={styles.loadMoreBtn}
          loading={inboxQuery.isFetchingNextPage}
          onClick={() => inboxQuery.fetchNextPage()}
        >
          {t('notifications.loadMoreButton')}
        </Button>
      )}
    </PageLayout>
  );
}
