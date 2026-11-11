import { useMemo } from 'react';
import InlineError from '@/shared/components/InlineError';
import { getErrorMessage } from '@/shared/api/apiError';
import type { MyEventSummary } from '@/features/events/types';
import {
  groupEventsByMonth,
  type EventMonthGroup,
} from '@/features/events/utils/groupEventsByMonth';
import { useLocale, useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import HistoryEventRow from './HistoryEventRow';
import type { MyEventsActions } from './useMyEventsActions';
import Button from '@/shared/components/Button';
import styles from '@/features/events/pages/MyEventsPage.module.css';

interface HistoryQueryState {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}

interface HistoryEventsPanelProps {
  totalFinished: number;
  events: MyEventSummary[];
  query: HistoryQueryState;
  actions: MyEventsActions;
}

function HistoryMonthGroups({
  groups,
  actions,
}: Readonly<{ groups: EventMonthGroup[]; actions: MyEventsActions }>) {
  const { t } = useTranslation();
  return groups.map((group) => (
    <section
      key={group.key}
      className={styles.monthSection}
      aria-labelledby={`my-events-month-${group.key}`}
    >
      <div className={styles.monthHeading}>
        <h3 id={`my-events-month-${group.key}`} className={styles.monthTitle}>
          {group.label}
        </h3>
        <span className={styles.monthRule} aria-hidden />
        <span className={styles.monthCount}>
          {pluralizeCount(
            group.events.length,
            'events.myEvents.monthGroupCountOne',
            'events.myEvents.monthGroupCountMany',
            t
          )}
        </span>
      </div>
      <div className={styles.grid}>
        {group.events.map((ev) => (
          <HistoryEventRow
            key={ev.id}
            event={ev}
            onDelete={ev.isCreator ? () => actions.handleDeleteEvent(ev.slug) : undefined}
            onReuse={ev.isCreator ? () => actions.handleReuseEvent(ev.slug, ev.title) : undefined}
          />
        ))}
      </div>
    </section>
  ));
}

function HistoryResults({
  totalFinished,
  events,
  query,
  actions,
}: Readonly<HistoryEventsPanelProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const monthGroups = useMemo(() => groupEventsByMonth(events, locale), [events, locale]);

  if (query.isLoading) return <p className="placeholder">{t('common.loading')}</p>;

  if (query.isError && events.length === 0) {
    return (
      <InlineError
        message={getErrorMessage(query.error, t('events.myEvents.fallbackError'))}
        retryLabel={t('common.retry')}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <>
      <HistoryMonthGroups groups={monthGroups} actions={actions} />
      {query.hasNextPage ? (
        <Button
          size="sm"
          className={styles.loadMoreBtn}
          onClick={() => query.fetchNextPage()}
          loading={query.isFetchingNextPage}
        >
          {t('events.myEvents.loadMoreCount', {
            count: Math.max(totalFinished - events.length, 0),
          })}
        </Button>
      ) : null}
    </>
  );
}

export default function HistoryEventsPanel(props: Readonly<HistoryEventsPanelProps>) {
  const { t } = useTranslation();
  const { totalFinished, actions } = props;
  if (totalFinished === 0) return null;

  return (
    <section className={styles.historySection} aria-labelledby="my-events-history-heading">
      <div className={styles.sectionHeading}>
        <h2 id="my-events-history-heading" className={styles.sectionTitle}>
          {t('events.myEvents.historySection')}
        </h2>
        <span className={styles.sectionCount}>{totalFinished}</span>
      </div>
      {actions.deleteError ? (
        <p className="error" role="alert">
          {actions.deleteError}
        </p>
      ) : null}
      <HistoryResults {...props} />
    </section>
  );
}
