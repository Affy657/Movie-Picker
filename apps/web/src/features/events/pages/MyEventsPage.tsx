import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Crown, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

function cardJoinedLabel(
  participantCount: number,
  maxParticipants: number | null | undefined,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
) {
  const n = participantCount;
  const hasCap = typeof maxParticipants === 'number' && maxParticipants > 0;
  if (hasCap) {
    return n === 1
      ? t('events.myEvents.joinedCountWithCapOne', { max: maxParticipants })
      : t('events.myEvents.joinedCountWithCapMany', { count: n, max: maxParticipants });
  }
  return n === 1
    ? t('events.myEvents.joinedCountOne')
    : t('events.myEvents.joinedCountMany', { count: n });
}

function cardMoviesLabel(
  movieCount: number,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
) {
  const n = movieCount;
  return n === 1
    ? t('events.myEvents.movieProposedOne')
    : t('events.myEvents.movieProposedMany', { count: n });
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
                <span className={styles.cardStats}>
                  {cardJoinedLabel(ev.participantCount ?? 0, ev.maxParticipants, t)} ·{' '}
                  {cardMoviesLabel(ev.movieCount ?? 0, t)}
                </span>
                <div className={styles.linkFooter}>
                  <span className={styles.meta}>
                    {dateLabel} · {ev.time}
                  </span>
                  {showLifecycleBadge && lifecycle !== 'upcoming' ? (
                    <span className={styles.lifecycleCorner}>
                      <span className={clsx(styles.lifecyclePill, badgeClass)}>
                        {t(lifecycleTranslationKey(lifecycle))}
                      </span>
                    </span>
                  ) : null}
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

type MyEventsTab = 'active' | 'history';

export default function MyEventsPage() {
  const { t } = useTranslation();
  useDocumentTitle(pageTitle(t('events.myEvents.title')));
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<MyEventsTab>('active');

  const [hasGuestSession] = useState<boolean>(() => listStoredParticipantSlugs().length > 0);

  const loggedInQuery = useQuery({
    queryKey: queryKeys.myEvents.list,
    queryFn: () => fetchMyEventsList(),
    enabled: !authLoading && !!user,
    retry: false,
  });

  const guestQuery = useQuery({
    queryKey: queryKeys.myEvents.guestJoined,
    queryFn: () => fetchGuestJoinedEventsSummaries(),
    enabled: !authLoading && (!user || hasGuestSession),
    retry: false,
  });

  const activeQuery = user ? loggedInQuery : guestQuery;

  useEffect(() => {
    if (!user) return;
    if (!loggedInQuery.isError || !ApiError.is(loggedInQuery.error)) return;
    if (loggedInQuery.error.code !== 401) return;
    queryClient.setQueryData(queryKeys.auth.me, null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  }, [user, loggedInQuery.isError, loggedInQuery.error, queryClient]);

  const mergedEvents = useMemo<MyEventSummary[]>(() => {
    const fromApi = activeQuery.data?.events ?? [];
    if (!user) return fromApi;
    const guestExtras = guestQuery.data?.events ?? [];
    if (guestExtras.length === 0) return fromApi;
    const knownSlugs = new Set(fromApi.map((e) => e.slug));
    const extras = guestExtras.filter((e) => !knownSlugs.has(e.slug));
    return extras.length === 0 ? fromApi : [...fromApi, ...extras];
  }, [user, activeQuery.data?.events, guestQuery.data?.events]);

  const { hostedActive, joinedActive, historyEvents } = useMemo(
    () => partitionMyEvents(mergedEvents),
    [mergedEvents]
  );

  const isLoading = authLoading || activeQuery.isLoading;
  const isError = activeQuery.isError;
  const error = activeQuery.error;

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
              onClick={() => void activeQuery.refetch()}
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
  const guestSkipped = !user ? (activeQuery.data?.guestSkippedCount ?? 0) : 0;
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
                <EventListBlock
                  sectionId="my-events-history"
                  heading={t('events.myEvents.historySection')}
                  events={historyEvents}
                  emptyHint={null}
                  showLifecycleBadge={false}
                />
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
