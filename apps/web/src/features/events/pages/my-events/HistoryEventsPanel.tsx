import { useMemo } from 'react';
import { History } from 'lucide-react';
import EmptyState from '@/shared/components/EmptyState';
import type { MyEventSummary } from '@/features/events/types';
import {
  groupEventsByMonth,
  type EventMonthGroup,
} from '@/features/events/utils/groupEventsByMonth';
import { useLocale, useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import HistoryEventList, { type HistoryEventHandlers } from './HistoryEventList';
import HistoryFiltersPanel from './HistoryFiltersPanel';
import HistoryRecap from './HistoryRecap';
import HistoryToolbar from './HistoryToolbar';
import type { useHistoryToolbar } from './useHistoryToolbar';
import type { MyEventsActions } from './useMyEventsActions';
import Button from '@/shared/components/Button';
import styles from '@/features/events/pages/MyEventsPage.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

const HISTORY_FILTERS_PANEL_ID = 'my-events-history-filters';

type HistoryToolbarState = ReturnType<typeof useHistoryToolbar>;

interface HistoryQueryState {
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}

interface HistoryEventsPanelProps {
  totalFinished: number;
  events: MyEventSummary[];
  searchQuery: string;
  query: HistoryQueryState;
  toolbar: HistoryToolbarState;
  actions: MyEventsActions;
}

function HistoryMonthGroups({
  groups,
  handlers,
}: Readonly<{ groups: EventMonthGroup[]; handlers: HistoryEventHandlers }>) {
  const { t } = useTranslation();
  return groups.map((group) => (
    <section
      key={group.key}
      className={styles.monthSection}
      aria-labelledby={`my-events-month-${group.key}`}
    >
      <div className={styles.monthHeading}>
        <h2 id={`my-events-month-${group.key}`} className={styles.sectionTitle}>
          {group.label}
        </h2>
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
      <HistoryEventList events={group.events} {...handlers} />
    </section>
  ));
}

function HistoryResults({
  totalFinished,
  events,
  searchQuery,
  query,
  toolbar,
  handlers,
}: Readonly<Omit<HistoryEventsPanelProps, 'actions'> & { handlers: HistoryEventHandlers }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const monthGroups = useMemo(
    () => groupEventsByMonth(toolbar.visibleEvents, locale),
    [toolbar.visibleEvents, locale]
  );

  if (query.isLoading) return <p className="placeholder">{t('common.loading')}</p>;

  if (events.length === 0) {
    return (
      <EmptyState
        compact
        icon={<History size={ICON_SIZE['2xl']} aria-hidden />}
        title={t('events.myEvents.searchNoResultsTitle')}
        message={t('events.myEvents.searchNoResults', { query: searchQuery })}
      />
    );
  }

  if (toolbar.visibleEvents.length === 0) {
    return (
      <EmptyState
        compact
        icon={<History size={ICON_SIZE['2xl']} aria-hidden />}
        title={t('events.myEvents.searchNoResultsTitle')}
        message={t('events.myEvents.historyNoResultsForFilters')}
      />
    );
  }

  const loadMoreLabel = searchQuery
    ? t('events.myEvents.loadMore')
    : t('events.myEvents.loadMoreCount', { count: Math.max(totalFinished - events.length, 0) });

  return (
    <>
      {toolbar.sortBy === 'date' ? (
        <HistoryMonthGroups groups={monthGroups} handlers={handlers} />
      ) : (
        <HistoryEventList events={toolbar.visibleEvents} {...handlers} />
      )}
      {query.hasNextPage ? (
        <Button
          size="sm"
          className={styles.loadMoreBtn}
          onClick={() => query.fetchNextPage()}
          loading={query.isFetchingNextPage}
        >
          {loadMoreLabel}
        </Button>
      ) : null}
    </>
  );
}

export default function HistoryEventsPanel({
  totalFinished,
  events,
  searchQuery,
  query,
  toolbar,
  actions,
}: Readonly<HistoryEventsPanelProps>) {
  const { t } = useTranslation();
  const handlers: HistoryEventHandlers = {
    onDelete: actions.handleDeleteEvent,
    onRemove: actions.handleHistoryRemove,
    onReuse: actions.handleReuseEvent,
  };

  return (
    <div role="tabpanel" id="myevents-panel-history" aria-labelledby="myevents-tab-history">
      {actions.deleteError ? (
        <p className="error" role="alert">
          {actions.deleteError}
        </p>
      ) : null}
      {actions.historyRemoveError ? (
        <p className="error" role="alert">
          {actions.historyRemoveError}
        </p>
      ) : null}

      {totalFinished === 0 ? (
        <EmptyState
          icon={<History size={ICON_SIZE['3xl']} aria-hidden />}
          title={t('events.myEvents.historyEmptyTitle')}
          message={t('events.myEvents.historyEmpty')}
        />
      ) : (
        <div className={styles.historyLayout}>
          <HistoryRecap totalFinished={totalFinished} />
          <HistoryToolbar
            search={toolbar.search}
            onSearchChange={toolbar.setSearch}
            sortBy={toolbar.sortBy}
            sortDir={toolbar.sortDir}
            onSetSort={toolbar.setSortBy}
            filtersOpen={toolbar.filtersOpen}
            onToggleFilters={() => toolbar.setFiltersOpen((v) => !v)}
            filtersPanelId={HISTORY_FILTERS_PANEL_ID}
            activeFilterCount={toolbar.activeFilterCount}
            isFiltered={toolbar.isFiltered}
            visibleCount={toolbar.visibleEvents.length}
            totalCount={events.length}
            onClearAll={toolbar.clearAllFilters}
          />
          {toolbar.filtersOpen ? (
            <HistoryFiltersPanel
              panelId={HISTORY_FILTERS_PANEL_ID}
              roles={toolbar.roles}
              onToggleRole={toolbar.toggleRole}
              outcomes={toolbar.outcomes}
              onToggleOutcome={toolbar.toggleOutcome}
            />
          ) : null}
          <HistoryResults
            totalFinished={totalFinished}
            events={events}
            searchQuery={searchQuery}
            query={query}
            toolbar={toolbar}
            handlers={handlers}
          />
        </div>
      )}
    </div>
  );
}
