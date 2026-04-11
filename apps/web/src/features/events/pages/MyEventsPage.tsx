import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchMyEventsList } from '@/features/events/api/eventsApi';
import PageLayout from '@/shared/components/PageLayout';
import { ApiError, getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import type { MyEventSummary } from '@/features/events/types';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import type { MyEventLifecycle } from '@/shared/types/event';
import { useLocale, useTranslation, type TranslationKey } from '@/shared/i18n';
import { formatMyEventsListDate } from '@/shared/utils/formatMyEventsListDate';
import { withReturnTo, ROUTES } from '@/app/routes';
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
  const parts = ev.date.split('-').map((p) => parseInt(p, 10));
  const timeParts = (ev.time ?? '00:00').split(':').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0;
  const y = parts[0]!;
  const mo = parts[1]!;
  const d = parts[2]!;
  const h = Number.isNaN(timeParts[0]!) ? 0 : timeParts[0]!;
  const mi = Number.isNaN(timeParts[1]!) ? 0 : timeParts[1]!;
  return new Date(y, mo - 1, d, h, mi).getTime();
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

export default function MyEventsPage() {
  const { t } = useTranslation();
  useDocumentTitle(pageTitle(t('events.myEvents.title')));
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.myEvents.list,
    queryFn: () => fetchMyEventsList(),
    retry: false,
  });

  useEffect(() => {
    if (!isError || !ApiError.is(error) || error.code !== 401) return;
    queryClient.setQueryData(queryKeys.auth.me, null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  }, [isError, error, queryClient]);

  const { hostedActive, joinedActive, historyEvents } = useMemo(() => {
    const events = data?.events ?? [];
    const hostedList = events.filter((e) => e.isCreator);
    const joinedList = events.filter((e) => !e.isCreator && e.isParticipant);

    const hostedActive = [...hostedList.filter((e) => !isFinishedEvent(e))].sort(sortActiveChrono);
    const joinedActive = [...joinedList.filter((e) => !isFinishedEvent(e))].sort(sortActiveChrono);

    const history = [
      ...hostedList.filter((e) => isFinishedEvent(e)),
      ...joinedList.filter((e) => isFinishedEvent(e)),
    ].sort(sortHistoryChrono);

    return { hostedActive, joinedActive, historyEvents: history };
  }, [data?.events]);

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
        <p className="error">{getErrorMessage(error, t('events.myEvents.fallbackError'))}</p>
        <Link to={withReturnTo(ROUTES.login, ROUTES.myEvents)}>
          {t('events.myEvents.reconnectLink')}
        </Link>
      </PageLayout>
    );
  }

  const total = (data?.events ?? []).length;

  return (
    <PageLayout className={styles.layout}>
      <h1 className={styles.pageTitle}>{t('events.myEvents.title')}</h1>
      {total === 0 ? (
        <p className="lead">{t('events.myEvents.emptyDescription')}</p>
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
      <nav
        className={`nav-actions ${styles.ctaNav}`}
        aria-label={t('events.myEvents.actionsNavLabel')}
      >
        <Link to={ROUTES.createEvent} className={`btn btn-primary ${styles.ctaButton}`}>
          {t('events.myEvents.createCta')}
        </Link>
      </nav>
    </PageLayout>
  );
}
