import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import clsx from 'clsx';
import {
  CalendarPlus,
  Crown,
  Film,
  History,
  LogOut,
  MoreVertical,
  Plus,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  deleteEvent,
  fetchMyEventsList,
  removeEventParticipant,
} from '@/features/events/api/eventsApi';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import EmptyState from '@/shared/components/EmptyState';
import { getStoredParticipant, removeStoredParticipant } from '@/features/events/storage';
import PageLayout from '@/shared/components/PageLayout';
import MyEventsSkeleton from '@/features/events/pages/MyEventsSkeleton';
import { ApiError, getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import type { MyEventSummary } from '@/features/events/types';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import type { MyEventLifecycle } from '@/shared/types/event';
import { useLocale, useTranslation, type TranslationKey } from '@/shared/i18n';
import { formatMyEventsListDate, formatEventTime } from '@/shared/utils/formatMyEventsListDate';
import { parseEventLocalStartMs } from '@/shared/utils/eventScheduleLocal';
import { withReturnTo, ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import styles from './MyEventsPage.module.css';

const badgeClassMap: Record<string, string | undefined> = {
  upcoming: styles.badgeUpcoming,
  live: styles.badgeLive,
  finished: styles.badgeFinished,
};

function isFinishedEvent(ev: MyEventSummary): boolean {
  return normalizeMyEventLifecycle(ev.lifecycle) === 'finished';
}

function eventDateTimeMs(ev: MyEventSummary): number {
  return parseEventLocalStartMs(ev.date, ev.time ?? '00:00') ?? 0;
}

function sortActiveChrono(a: MyEventSummary, b: MyEventSummary): number {
  return eventDateTimeMs(a) - eventDateTimeMs(b);
}

function sortHistoryChrono(a: MyEventSummary, b: MyEventSummary): number {
  return eventDateTimeMs(b) - eventDateTimeMs(a);
}

function lifecycleTranslationKey(l: MyEventLifecycle): TranslationKey {
  switch (l) {
    case 'upcoming':
      return 'events.lifecycle.upcoming';
    case 'live':
      return 'events.lifecycle.live';
    case 'finished':
      return 'events.lifecycle.finished';
    default:
      return 'events.lifecycle.finished';
  }
}

function cardJoinedLabel(participantCount: number, maxParticipants: number | null | undefined) {
  const n = participantCount;
  const hasCap = typeof maxParticipants === 'number' && maxParticipants > 0;
  const countStr = hasCap ? `${n} / ${maxParticipants}` : String(n);
  return (
    <span className={styles.participantStat}>
      <Users aria-hidden size={13} />
      {countStr}
    </span>
  );
}

function cardMoviesLabel(movieCount: number) {
  return (
    <span className={styles.participantStat}>
      <Film aria-hidden size={13} />
      {movieCount}
    </span>
  );
}

function EventCardKebab({
  title,
  onDelete,
  onLeave,
}: Readonly<{
  title: string;
  onDelete?: () => void;
  onLeave?: () => void;
}>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(rootRef, close, open);

  if (!onDelete && !onLeave) return null;

  return (
    <div className={styles.itemKebab} ref={rootRef}>
      <button
        type="button"
        className={styles.itemKebabBtn}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('events.myEvents.eventOptionsLabel', { title })}
      >
        <MoreVertical aria-hidden size={16} />
      </button>
      {open ? (
        <div className={styles.itemKebabMenu} role="menu">
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              className={styles.itemKebabItemDanger}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                onDelete();
              }}
            >
              <Trash2 aria-hidden size={14} />
              <span>{t('events.danger.deleteButton')}</span>
            </button>
          )}
          {onLeave && (
            <button
              type="button"
              role="menuitem"
              className={styles.itemKebabItemDanger}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                onLeave();
              }}
            >
              <LogOut aria-hidden size={14} />
              <span>{t('events.participants.leaveAction')}</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function EventListBlock({
  sectionId,
  heading,
  events,
  showLifecycleBadge = true,
  onDeleteEvent,
  onLeaveEvent,
}: Readonly<{
  sectionId: string;
  heading: string;
  events: MyEventSummary[];
  showLifecycleBadge?: boolean;
  onDeleteEvent?: (slug: string) => void;
  onLeaveEvent?: (slug: string) => void;
}>) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  if (events.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby={sectionId}>
      <h2 id={sectionId} className={styles.sectionTitle}>
        {heading}
      </h2>
      <ul className={styles.list}>
        {events.map((ev) => {
          const lifecycle = normalizeMyEventLifecycle(ev.lifecycle);
          const badgeClass = badgeClassMap[lifecycle] ?? '';
          const dateLabel = formatMyEventsListDate(ev.date, locale);
          return (
            <li key={ev.id} className={styles.item}>
              <Link
                to={ROUTES.eventDetail(ev.slug)}
                className={clsx(
                  styles.link,
                  ev.winnerMovieTitle && styles.winnerCard,
                  ((onDeleteEvent && ev.isCreator) || (onLeaveEvent && !ev.isCreator)) &&
                    styles.linkWithKebab
                )}
              >
                <span className={styles.rowTop}>
                  <span className={styles.title}>{ev.title}</span>
                  {ev.isCreator ? (
                    <span
                      className={styles.badgeHost}
                      title={t('events.myEvents.hostBadgeTitle')}
                      aria-label={t('events.myEvents.hostBadge')}
                    >
                      <Crown aria-hidden size={14} />
                    </span>
                  ) : null}
                </span>
                {ev.theme ? <span className={styles.cardTheme}>{ev.theme}</span> : null}
                {ev.winnerMovieTitle ? (
                  <span className={styles.winnerRow}>
                    {ev.winnerMoviePosterPath ? (
                      <img
                        src={posterImageSrc(ev.winnerMoviePosterPath)}
                        alt=""
                        aria-hidden
                        className={styles.winnerPoster}
                        width={28}
                        height={42}
                      />
                    ) : (
                      <Trophy aria-hidden size={13} className={styles.winnerIcon} />
                    )}
                    <span className={styles.winnerTitle}>{ev.winnerMovieTitle}</span>
                  </span>
                ) : null}
                <div className={styles.linkFooter}>
                  <span className={styles.cardStats}>
                    {cardJoinedLabel(ev.participantCount ?? 0, ev.maxParticipants)}
                    {cardMoviesLabel(ev.movieCount ?? 0)}
                  </span>
                  <span className={styles.metaRight}>
                    {showLifecycleBadge && lifecycle !== 'upcoming' ? (
                      <span className={clsx(styles.lifecyclePill, badgeClass)}>
                        {t(lifecycleTranslationKey(lifecycle))}
                      </span>
                    ) : null}
                    <span className={styles.meta}>
                      {formatEventTime(ev.time)} – {dateLabel}
                    </span>
                  </span>
                </div>
              </Link>
              {onDeleteEvent && ev.isCreator && (
                <EventCardKebab title={ev.title} onDelete={() => onDeleteEvent(ev.slug)} />
              )}
              {onLeaveEvent && !ev.isCreator && (
                <EventCardKebab title={ev.title} onLeave={() => onLeaveEvent(ev.slug)} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function partitionMyEvents(events: MyEventSummary[]) {
  const hostedList = events.filter((e) => e.isCreator);
  const joinedList = events.filter((e) => !e.isCreator && e.isParticipant);

  const hostedActive = [...hostedList.filter((e) => !isFinishedEvent(e))].sort(sortActiveChrono);
  const joinedActive = [...joinedList.filter((e) => !isFinishedEvent(e))].sort(sortActiveChrono);

  const history = [
    ...hostedList.filter((e) => isFinishedEvent(e)),
    ...joinedList.filter((e) => isFinishedEvent(e)),
  ].sort(sortHistoryChrono);

  return { hostedActive, joinedActive, historyEvents: history };
}

const HISTORY_PAGE_SIZE = 10;

type MyEventsTab = 'active' | 'history';

function onSentinelIntersect(
  entries: IntersectionObserverEntry[],
  query: {
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => Promise<unknown>;
  },
  loadNextChunk: () => void
): void {
  if (!entries[0]?.isIntersecting) return;
  if (query.isFetchingNextPage) return;
  if (query.hasNextPage) {
    query.fetchNextPage().then(loadNextChunk);
  } else {
    loadNextChunk();
  }
}

function ActiveEventsPanel({
  hostedActive,
  joinedActive,
  onLeaveEvent,
  t,
}: Readonly<{
  hostedActive: MyEventSummary[];
  joinedActive: MyEventSummary[];
  onLeaveEvent: (slug: string) => void;
  t: ReturnType<typeof useTranslation>['t'];
}>) {
  if (hostedActive.length === 0 && joinedActive.length === 0) {
    return (
      <EmptyState
        icon={<CalendarPlus size={26} aria-hidden />}
        title={t('events.myEvents.activeEmptyTitle')}
        message={t('events.myEvents.activeEmpty')}
      />
    );
  }
  return (
    <>
      <EventListBlock
        sectionId="my-events-hosted"
        heading={t('events.myEvents.hostedSection')}
        events={hostedActive}
      />
      <EventListBlock
        sectionId="my-events-joined"
        heading={t('events.myEvents.joinedSection')}
        events={joinedActive}
        onLeaveEvent={onLeaveEvent}
      />
    </>
  );
}

function HistoryEventsPanel({
  historyEvents,
  visibleHistoryCount,
  hasNextPage,
  infiniteScrollActive,
  sentinelRef,
  onActivateInfiniteScroll,
  onDeleteEvent,
  t,
}: Readonly<{
  historyEvents: MyEventSummary[];
  visibleHistoryCount: number;
  hasNextPage: boolean;
  infiniteScrollActive: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onActivateInfiniteScroll: () => void;
  onDeleteEvent: (slug: string) => void;
  t: ReturnType<typeof useTranslation>['t'];
}>) {
  if (historyEvents.length === 0) {
    return (
      <EmptyState
        icon={<History size={26} aria-hidden />}
        title={t('events.myEvents.historyEmptyTitle')}
        message={t('events.myEvents.historyEmpty')}
      />
    );
  }
  const showLoadMore = visibleHistoryCount < historyEvents.length || hasNextPage;
  return (
    <>
      <EventListBlock
        sectionId="my-events-history"
        heading={t('events.myEvents.historySection')}
        events={historyEvents.slice(0, visibleHistoryCount)}
        showLifecycleBadge={false}
        onDeleteEvent={onDeleteEvent}
      />
      {showLoadMore &&
        (infiniteScrollActive ? (
          <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
        ) : (
          <button type="button" className={styles.loadMoreBtn} onClick={onActivateInfiniteScroll}>
            Voir plus
          </button>
        ))}
    </>
  );
}

export default function MyEventsPage() {
  const { t } = useTranslation();
  useDocumentTitle(pageTitle(t('events.myEvents.title')));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { track } = useAnalytics();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: MyEventsTab = searchParams.get('tab') === 'history' ? 'history' : 'active';
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(HISTORY_PAGE_SIZE);
  const [infiniteScrollActive, setInfiniteScrollActive] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<{ slug: string; participantId: string } | null>(
    null
  );

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => deleteEvent(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.listPaged });
      setDeleteError(null);
      track('event_deleted');
    },
    onError: (e) => {
      setDeleteError(getErrorMessage(e, t('events.danger.deleteError')));
    },
    onSettled: () => {
      setConfirmDeleteSlug(null);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: ({ slug, participantId }: { slug: string; participantId: string }) =>
      removeEventParticipant(slug, participantId, null),
    onSuccess: (_, { slug }) => {
      removeStoredParticipant(slug);
      queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.listPaged });
      setLeaveError(null);
      track('event_left');
    },
    onError: (e) => {
      setLeaveError(getErrorMessage(e, t('events.participants.leaveError')));
    },
    onSettled: () => {
      setConfirmLeave(null);
    },
  });

  const handleLeaveEvent = useCallback(
    (slug: string) => {
      const stored = getStoredParticipant(slug);
      if (!stored) {
        navigate(ROUTES.eventDetail(slug));
        return;
      }
      setLeaveError(null);
      setConfirmLeave({ slug, participantId: stored.participantId });
    },
    [navigate]
  );

  const loggedInQuery = useInfiniteQuery({
    queryKey: queryKeys.myEvents.listPaged,
    queryFn: ({ pageParam }: { pageParam: number }) => fetchMyEventsList(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.hasMore) return undefined;
      return allPages?.reduce((sum, p) => sum + (p?.events?.length ?? 0), 0) ?? 0;
    },
    enabled: !authLoading && !!user,
    retry: false,
  });

  useEffect(() => {
    if (authLoading || user) return;
    navigate(withReturnTo(ROUTES.login, ROUTES.myEvents), { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    if (!loggedInQuery.isError || !ApiError.is(loggedInQuery.error)) return;
    if (loggedInQuery.error.code !== 401) return;
    queryClient.setQueryData(queryKeys.auth.me, null);
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  }, [user, loggedInQuery.isError, loggedInQuery.error, queryClient]);

  const loadNextChunk = useCallback(() => {
    setVisibleHistoryCount((c) => c + HISTORY_PAGE_SIZE);
  }, []);

  useEffect(() => {
    if (!infiniteScrollActive) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => onSentinelIntersect(entries, loggedInQuery, loadNextChunk),
      { rootMargin: '120px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [infiniteScrollActive, loggedInQuery, loadNextChunk]);

  const mergedEvents = useMemo<MyEventSummary[]>(
    () => loggedInQuery.data?.pages.flatMap((p) => p.events) ?? [],
    [loggedInQuery.data?.pages]
  );

  const { hostedActive, joinedActive, historyEvents } = useMemo(
    () => partitionMyEvents(mergedEvents),
    [mergedEvents]
  );

  const isLoading = authLoading || !user || loggedInQuery.isLoading;
  const isError = loggedInQuery.isError;
  const error = loggedInQuery.error;

  const loadErrorMessage =
    error == null ? '' : getErrorMessage(error, t('events.myEvents.fallbackError'));

  if (isLoading) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className="visually-hidden">{t('events.myEvents.title')}</h1>
        <MyEventsSkeleton label={t('events.myEvents.loadingDetail')} />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className="visually-hidden">{t('events.myEvents.title')}</h1>
        <p className="error" role="alert">
          {loadErrorMessage}
        </p>
        <Link to={withReturnTo(ROUTES.login, ROUTES.myEvents)}>
          {t('events.myEvents.reconnectLink')}
        </Link>
      </PageLayout>
    );
  }

  const total = mergedEvents.length;
  const emptyLead = t('events.myEvents.emptyDescription');

  return (
    <PageLayout className={styles.layout}>
      <h1 className={styles.pageTitle}>{t('events.myEvents.title')}</h1>
      {total === 0 ? (
        <EmptyState
          icon={<CalendarPlus size={26} aria-hidden />}
          title={t('events.myEvents.emptyTitle')}
          message={emptyLead}
          actions={
            <Link to={ROUTES.createEvent} className="btn btn-primary">
              {t('events.myEvents.createCta')}
            </Link>
          }
        />
      ) : (
        <>
          <div className={styles.tabs} role="tablist" aria-label={t('events.myEvents.title')}>
            <button
              type="button"
              role="tab"
              id="myevents-tab-active"
              aria-selected={tab === 'active'}
              aria-controls="myevents-panel-active"
              className={clsx(styles.tab, tab === 'active' && styles.tabActive)}
              onClick={() => setSearchParams({}, { replace: true })}
            >
              {'À venir'}
              <span className={styles.tabCount}>{hostedActive.length + joinedActive.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="myevents-tab-history"
              aria-selected={tab === 'history'}
              aria-controls="myevents-panel-history"
              className={clsx(styles.tab, tab === 'history' && styles.tabActive)}
              onClick={() => setSearchParams({ tab: 'history' }, { replace: true })}
            >
              {'Historique'}
              <span className={styles.tabCount}>{historyEvents.length}</span>
            </button>
          </div>
          {tab === 'active' ? (
            <div role="tabpanel" id="myevents-panel-active" aria-labelledby="myevents-tab-active">
              <ActiveEventsPanel
                hostedActive={hostedActive}
                joinedActive={joinedActive}
                onLeaveEvent={handleLeaveEvent}
                t={t}
              />
            </div>
          ) : (
            <div role="tabpanel" id="myevents-panel-history" aria-labelledby="myevents-tab-history">
              <HistoryEventsPanel
                historyEvents={historyEvents}
                visibleHistoryCount={visibleHistoryCount}
                hasNextPage={loggedInQuery.hasNextPage}
                infiniteScrollActive={infiniteScrollActive}
                sentinelRef={sentinelRef}
                onActivateInfiniteScroll={() => {
                  setInfiniteScrollActive(true);
                  loadNextChunk();
                }}
                onDeleteEvent={setConfirmDeleteSlug}
                t={t}
              />
            </div>
          )}
        </>
      )}
      {total > 0 ? (
        <Link
          to={ROUTES.createEvent}
          className={styles.fab}
          aria-label={t('events.myEvents.createCta')}
        >
          <Plus size={20} aria-hidden className={styles.fabIcon} />
          <span className={styles.fabLabel}>{t('events.myEvents.createCta')}</span>
        </Link>
      ) : null}
      {deleteError ? (
        <p className="error" role="alert">
          {deleteError}
        </p>
      ) : null}
      {leaveError ? (
        <p className="error" role="alert">
          {leaveError}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmDeleteSlug !== null}
        title={t('events.danger.deleteConfirmTitle')}
        message={t('events.danger.deleteConfirmMessage', {
          title: historyEvents.find((e) => e.slug === confirmDeleteSlug)?.title ?? '',
        })}
        confirmLabel={t('events.danger.deleteConfirmAction')}
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (confirmDeleteSlug) deleteMutation.mutate(confirmDeleteSlug);
        }}
        onCancel={() => {
          setConfirmDeleteSlug(null);
          setDeleteError(null);
        }}
      />
      <ConfirmDialog
        open={confirmLeave !== null}
        title={t('events.participants.leaveConfirmTitle')}
        message={t('events.participants.leaveConfirm')}
        confirmLabel={t('events.participants.leaveConfirmAction')}
        busy={leaveMutation.isPending}
        onConfirm={() => {
          if (confirmLeave) leaveMutation.mutate(confirmLeave);
        }}
        onCancel={() => {
          setConfirmLeave(null);
          setLeaveError(null);
        }}
      />
    </PageLayout>
  );
}
