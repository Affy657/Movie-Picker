import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Crown, Film, Plus, Trophy, Users } from 'lucide-react';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  fetchGuestJoinedEventsSummaries,
  fetchMyEventsList,
  GUEST_JOINED_EVENTS_ALL_FAILED,
} from '@/features/events/api/eventsApi';
import { listStoredParticipantSlugs } from '@/features/events/storage';
import PageLayout from '@/shared/components/PageLayout';
import MyEventsSkeleton from '@/features/events/pages/MyEventsSkeleton';
import { ApiError, getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import type { MyEventSummary } from '@/features/events/types';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import type { MyEventLifecycle } from '@/shared/types/event';
import { useLocale, useTranslation, type TranslationKey } from '@/shared/i18n';
import { formatMyEventsListDate } from '@/shared/utils/formatMyEventsListDate';
import { parseEventLocalStartMs } from '@/shared/utils/eventScheduleLocal';
import { withReturnTo, ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
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

function EventListBlock({
  sectionId,
  heading,
  events,
  emptyHint,
  showLifecycleBadge = true,
}: {
  sectionId: string;
  heading: string;
  events: MyEventSummary[];
  emptyHint: string | null;
  showLifecycleBadge?: boolean;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  if (events.length === 0) {
    if (!emptyHint) return null;
    return (
      <section className={styles.section} aria-labelledby={sectionId}>
        <h2 id={sectionId} className={styles.sectionTitle}>
          {heading}
        </h2>
        <p className={styles.sectionEmpty}>{emptyHint}</p>
      </section>
    );
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
              <Link to={ROUTES.eventDetail(ev.slug)} className={styles.link}>
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
                      {ev.time} – {dateLabel}
                    </span>
                  </span>
                </div>
              </Link>
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

export default function MyEventsPage() {
  const { t } = useTranslation();
  useDocumentTitle(pageTitle(t('events.myEvents.title')));
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<MyEventsTab>('active');
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(HISTORY_PAGE_SIZE);
  const [infiniteScrollActive, setInfiniteScrollActive] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [hasGuestSession] = useState<boolean>(() => listStoredParticipantSlugs().length > 0);

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

  const guestQuery = useQuery({
    queryKey: queryKeys.myEvents.guestJoined,
    queryFn: () => fetchGuestJoinedEventsSummaries(),
    enabled: !authLoading && (!user || hasGuestSession),
    retry: false,
  });

  useEffect(() => {
    if (!user) return;
    if (!loggedInQuery.isError || !ApiError.is(loggedInQuery.error)) return;
    if (loggedInQuery.error.code !== 401) return;
    queryClient.setQueryData(queryKeys.auth.me, null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  }, [user, loggedInQuery.isError, loggedInQuery.error, queryClient]);

  const loadNextChunk = useCallback(() => {
    setVisibleHistoryCount((c) => c + HISTORY_PAGE_SIZE);
  }, []);

  useEffect(() => {
    if (!infiniteScrollActive) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (loggedInQuery.isFetchingNextPage) return;
        if (loggedInQuery.hasNextPage) {
          void loggedInQuery.fetchNextPage().then(loadNextChunk);
        } else {
          loadNextChunk();
        }
      },
      { rootMargin: '120px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [infiniteScrollActive, loggedInQuery, loadNextChunk]);

  const mergedEvents = useMemo<MyEventSummary[]>(() => {
    const fromApi = user
      ? (loggedInQuery.data?.pages.flatMap((p) => p.events) ?? [])
      : (guestQuery.data?.events ?? []);
    if (!user) return fromApi;
    const guestExtras = guestQuery.data?.events ?? [];
    if (guestExtras.length === 0) return fromApi;
    const knownSlugs = new Set(fromApi.map((e) => e.slug));
    const extras = guestExtras.filter((e) => !knownSlugs.has(e.slug));
    return extras.length === 0 ? fromApi : [...fromApi, ...extras];
  }, [user, loggedInQuery.data?.pages, guestQuery.data?.events]);

  const { hostedActive, joinedActive, historyEvents } = useMemo(
    () => partitionMyEvents(mergedEvents),
    [mergedEvents]
  );

  const isLoading = authLoading || (user ? loggedInQuery.isLoading : guestQuery.isLoading);
  const isError = user ? loggedInQuery.isError : guestQuery.isError;
  const error = user ? loggedInQuery.error : guestQuery.error;

  const loadErrorMessage =
    error == null
      ? ''
      : ApiError.is(error) && error.message === GUEST_JOINED_EVENTS_ALL_FAILED
        ? t('events.myEvents.guestAllFailedError')
        : getErrorMessage(
            error,
            user ? t('events.myEvents.fallbackError') : t('events.myEvents.guestFallbackError')
          );

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
        {user ? (
          <Link to={withReturnTo(ROUTES.login, ROUTES.myEvents)}>
            {t('events.myEvents.reconnectLink')}
          </Link>
        ) : (
          <nav className="nav-actions" aria-label={t('events.myEvents.guestErrorActionsLabel')}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void guestQuery.refetch()}
            >
              {t('common.retry')}
            </button>
            <Link to={withReturnTo(ROUTES.login, ROUTES.myEvents)} className="btn">
              {t('events.myEvents.guestLoginCta')}
            </Link>
            <Link to={withReturnTo(ROUTES.register, ROUTES.myEvents)} className="btn">
              {t('events.myEvents.guestRegisterCta')}
            </Link>
          </nav>
        )}
      </PageLayout>
    );
  }

  const total = mergedEvents.length;
  const guestSkipped = !user ? (guestQuery.data?.guestSkippedCount ?? 0) : 0;
  const emptyLead = user
    ? t('events.myEvents.emptyDescription')
    : t('events.myEvents.emptyDescriptionGuest');

  return (
    <PageLayout className={styles.layout}>
      <h1 className={styles.pageTitle}>{t('events.myEvents.title')}</h1>
      {guestSkipped > 0 ? (
        <p className="muted" role="status">
          {t('events.myEvents.guestPartialSkipped', { count: guestSkipped })}
        </p>
      ) : null}
      {total === 0 ? (
        <p className="lead">{emptyLead}</p>
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
              onClick={() => setTab('active')}
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
              onClick={() => setTab('history')}
            >
              {'Historique'}
              <span className={styles.tabCount}>{historyEvents.length}</span>
            </button>
          </div>
          {tab === 'active' ? (
            <div role="tabpanel" id="myevents-panel-active" aria-labelledby="myevents-tab-active">
              {hostedActive.length === 0 && joinedActive.length === 0 ? (
                <p className={styles.sectionEmpty}>{t('events.myEvents.activeEmpty')}</p>
              ) : (
                <>
                  <EventListBlock
                    sectionId="my-events-hosted"
                    heading={t('events.myEvents.hostedSection')}
                    events={hostedActive}
                    emptyHint={null}
                  />
                  <EventListBlock
                    sectionId="my-events-joined"
                    heading={t('events.myEvents.joinedSection')}
                    events={joinedActive}
                    emptyHint={null}
                  />
                </>
              )}
            </div>
          ) : (
            <div role="tabpanel" id="myevents-panel-history" aria-labelledby="myevents-tab-history">
              {historyEvents.length === 0 ? (
                <p className={styles.sectionEmpty}>{t('events.myEvents.historyEmpty')}</p>
              ) : (
                <>
                  <EventListBlock
                    sectionId="my-events-history"
                    heading={t('events.myEvents.historySection')}
                    events={historyEvents.slice(0, visibleHistoryCount)}
                    emptyHint={null}
                    showLifecycleBadge={false}
                  />
                  {(visibleHistoryCount < historyEvents.length || loggedInQuery.hasNextPage) &&
                    (infiniteScrollActive ? (
                      <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
                    ) : (
                      <button
                        type="button"
                        className={styles.loadMoreBtn}
                        onClick={() => {
                          setInfiniteScrollActive(true);
                          loadNextChunk();
                        }}
                      >
                        Voir plus
                      </button>
                    ))}
                </>
              )}
            </div>
          )}
        </>
      )}
      {user ? (
        <Link
          to={ROUTES.createEvent}
          className={styles.fab}
          aria-label={t('events.myEvents.createCta')}
        >
          <Plus size={20} aria-hidden className={styles.fabIcon} />
          <span className={styles.fabLabel}>{t('events.myEvents.createCta')}</span>
        </Link>
      ) : (
        <nav
          className={`nav-actions ${styles.ctaNav}`}
          aria-label={t('events.myEvents.guestActionsNavLabel')}
        >
          <Link
            to={withReturnTo(ROUTES.login, ROUTES.myEvents)}
            className={`btn btn-primary ${styles.ctaButton}`}
          >
            {t('events.myEvents.guestLoginCta')}
          </Link>
          <Link to={withReturnTo(ROUTES.register, ROUTES.myEvents)} className="btn">
            {t('events.myEvents.guestRegisterCta')}
          </Link>
        </nav>
      )}
    </PageLayout>
  );
}
