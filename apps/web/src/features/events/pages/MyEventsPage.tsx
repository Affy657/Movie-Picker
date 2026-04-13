import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  fetchGuestJoinedEventsSummaries,
  fetchMyEventsList,
  GUEST_JOINED_EVENTS_ALL_FAILED,
} from '@/features/events/api/eventsApi';
import PageLayout from '@/shared/components/PageLayout';
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
              <Link
                to={ROUTES.eventDetail(ev.slug)}
                className={clsx(styles.link, !showLifecycleBadge && styles.linkHistory)}
              >
                <span className={styles.rowTop}>
                  <span className={styles.title}>{ev.title}</span>
                  {ev.isCreator ? (
                    <span className={styles.badgeHost} title={t('events.myEvents.hostBadgeTitle')}>
                      {t('events.myEvents.hostBadge')}
                    </span>
                  ) : null}
                </span>
                {showLifecycleBadge ? (
                  <span className={styles.rowBadges}>
                    <span className={badgeClass}>{t(lifecycleTranslationKey(lifecycle))}</span>
                  </span>
                ) : null}
                <span className={styles.meta}>
                  {dateLabel} · {ev.time}
                </span>
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

export default function MyEventsPage() {
  const { t } = useTranslation();
  useDocumentTitle(pageTitle(t('events.myEvents.title')));
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();

  const loggedInQuery = useQuery({
    queryKey: queryKeys.myEvents.list,
    queryFn: () => fetchMyEventsList(),
    enabled: !authLoading && !!user,
    retry: false,
  });

  const guestQuery = useQuery({
    queryKey: queryKeys.myEvents.guestJoined,
    queryFn: () => fetchGuestJoinedEventsSummaries(),
    enabled: !authLoading && !user,
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

  const { hostedActive, joinedActive, historyEvents } = useMemo(
    () => partitionMyEvents(activeQuery.data?.events ?? []),
    [activeQuery.data?.events]
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
        <p className="placeholder" aria-busy="true">
          {t('events.myEvents.loadingDetail')}
        </p>
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
            <button type="button" className="btn btn-primary" onClick={() => void activeQuery.refetch()}>
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

  const total = (activeQuery.data?.events ?? []).length;
  const guestSkipped = !user ? (activeQuery.data?.guestSkippedCount ?? 0) : 0;
  const emptyLead = user ? t('events.myEvents.emptyDescription') : t('events.myEvents.emptyDescriptionGuest');

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
          <EventListBlock
            sectionId="my-events-history"
            heading={t('events.myEvents.historySection')}
            events={historyEvents}
            emptyHint={null}
            showLifecycleBadge={false}
          />
        </>
      )}
      {user ? (
        <nav
          className={`nav-actions ${styles.ctaNav}`}
          aria-label={t('events.myEvents.actionsNavLabel')}
        >
          <Link to={ROUTES.createEvent} className={`btn btn-primary ${styles.ctaButton}`}>
            {t('events.myEvents.createCta')}
          </Link>
        </nav>
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
