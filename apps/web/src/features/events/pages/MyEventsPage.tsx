import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { CalendarPlus, History } from 'lucide-react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  deleteEvent,
  fetchMyEventsList,
  postEventClose,
  removeEventParticipant,
} from '@/features/events/api/eventsApi';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import EmptyState from '@/shared/components/EmptyState';
import SignedOutState from '@/shared/components/SignedOutState';
import SessionCheckErrorState from '@/features/auth/components/SessionCheckErrorState';
import { getStoredParticipant, removeStoredParticipant } from '@/features/events/storage';
import PageLayout from '@/shared/components/PageLayout';
import MyEventsSkeleton from '@/features/events/pages/MyEventsSkeleton';
import { ApiError, getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTablistKeyboard } from '@/shared/hooks/useTablistKeyboard';
import type { MyEventSummary } from '@/features/events/types';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import { groupEventsByMonth } from '@/features/events/utils/groupEventsByMonth';
import { useLocale, useTranslation } from '@/shared/i18n';
import { withReturnTo, ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import EventCardMenu from '@/features/events/components/EventCardMenu';
import {
  EventSummaryCardBody,
  eventSummaryCardStyles,
} from '@/features/events/components/EventSummaryCard';
import PendingEventsSection from '@/features/events/pages/my-events/PendingEventsSection';
import HistoryRecap from '@/features/events/pages/my-events/HistoryRecap';
import HistoryToolbar from '@/features/events/pages/my-events/HistoryToolbar';
import HistoryFiltersPanel from '@/features/events/pages/my-events/HistoryFiltersPanel';
import { useHistoryToolbar } from '@/features/events/pages/my-events/useHistoryToolbar';
import HistoryEventRow from '@/features/events/pages/my-events/HistoryEventRow';
import styles from './MyEventsPage.module.css';
import Button, { buttonClass } from '@/shared/components/Button';

const HISTORY_FILTERS_PANEL_ID = 'my-events-history-filters';

type MyEventsTab = 'active' | 'history';

function isPendingEvent(ev: MyEventSummary): boolean {
  return normalizeMyEventLifecycle(ev.lifecycle) === 'pending';
}

function flattenEvents(pages: Array<{ events: MyEventSummary[] }> | undefined): MyEventSummary[] {
  return pages?.flatMap((p) => p.events) ?? [];
}

export default function MyEventsPage() {
  const { t } = useTranslation();
  useNoindexPage(pageTitle(t('events.myEvents.title')), ROUTES.myEvents);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, authCheckFailed } = useAuth();
  const { track } = useAnalytics();
  const { locale } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: MyEventsTab = searchParams.get('tab') === 'history' ? 'history' : 'active';

  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<{ slug: string; participantId: string } | null>(
    null
  );
  const [confirmHistoryRemove, setConfirmHistoryRemove] = useState<{
    slug: string;
    participantId: string;
    title: string;
  } | null>(null);
  const [confirmClose, setConfirmClose] = useState<{ slug: string; title: string } | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [historyRemoveError, setHistoryRemoveError] = useState<string | null>(null);

  const invalidateMyEvents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => deleteEvent(slug),
    onSuccess: () => {
      invalidateMyEvents();
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
      invalidateMyEvents();
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

  const historyRemoveMutation = useMutation({
    mutationFn: ({ slug, participantId }: { slug: string; participantId: string }) =>
      removeEventParticipant(slug, participantId, null),
    onSuccess: (_, { slug }) => {
      removeStoredParticipant(slug);
      invalidateMyEvents();
      setHistoryRemoveError(null);
    },
    onError: (e) => {
      setHistoryRemoveError(getErrorMessage(e, t('events.myEvents.historyRemoveError')));
    },
    onSettled: () => {
      setConfirmHistoryRemove(null);
    },
  });

  const closeMutation = useMutation({
    mutationFn: (slug: string) => postEventClose(slug, null),
    onSuccess: () => {
      invalidateMyEvents();
      setCloseError(null);
    },
    onError: (e) => {
      setCloseError(getErrorMessage(e, t('events.wheel.closeError')));
    },
    onSettled: () => {
      setConfirmClose(null);
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

  const handleHistoryRemove = useCallback(
    (slug: string, title: string) => {
      const stored = getStoredParticipant(slug);
      if (!stored) {
        navigate(ROUTES.eventDetail(slug));
        return;
      }
      setHistoryRemoveError(null);
      setConfirmHistoryRemove({ slug, participantId: stored.participantId, title });
    },
    [navigate]
  );

  const activeQuery = useInfiniteQuery({
    queryKey: queryKeys.myEvents.active,
    queryFn: ({ pageParam }: { pageParam: number }) => fetchMyEventsList('active', pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.hasMore) return undefined;
      return allPages.reduce((sum, p) => sum + p.events.length, 0);
    },
    enabled: !authLoading && !!user,
    retry: false,
  });

  const historyQuery = useInfiniteQuery({
    queryKey: queryKeys.myEvents.finished(historySearchQuery),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchMyEventsList('finished', pageParam, historySearchQuery || undefined),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.hasMore) return undefined;
      return allPages.reduce((sum, p) => sum + p.events.length, 0);
    },
    enabled: !authLoading && !!user && tab === 'history',
    retry: false,
  });

  useEffect(() => {
    if (!user) return;
    if (!activeQuery.isError || !ApiError.is(activeQuery.error)) return;
    if (activeQuery.error.code !== 401) return;
    queryClient.setQueryData(queryKeys.auth.me, null);
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  }, [user, activeQuery.isError, activeQuery.error, queryClient]);

  const activeEvents = useMemo(() => flattenEvents(activeQuery.data?.pages), [activeQuery.data]);
  const historyEvents = useMemo(() => flattenEvents(historyQuery.data?.pages), [historyQuery.data]);

  const historyToolbar = useHistoryToolbar({ events: historyEvents });
  useEffect(() => {
    const id = setTimeout(() => setHistorySearchQuery(historyToolbar.search.trim()), 300);
    return () => clearTimeout(id);
  }, [historyToolbar.search]);

  const pendingEvents = useMemo(() => activeEvents.filter(isPendingEvent), [activeEvents]);
  const upcomingEvents = useMemo(
    () => activeEvents.filter((e) => !isPendingEvent(e)),
    [activeEvents]
  );

  const firstPage = activeQuery.data?.pages[0] ?? historyQuery.data?.pages[0];
  const totalActive = firstPage?.totalActive ?? 0;
  const totalFinished = firstPage?.totalFinished ?? 0;

  const tabs = useMemo<MyEventsTab[]>(() => ['active', 'history'], []);
  const setTab = useCallback(
    (next: MyEventsTab) => {
      setSearchParams(next === 'history' ? { tab: 'history' } : {}, { replace: true });
    },
    [setSearchParams]
  );
  const tablist = useTablistKeyboard(tabs, tab, setTab);

  const monthGroups = useMemo(
    () => groupEventsByMonth(historyToolbar.visibleEvents, locale),
    [historyToolbar.visibleEvents, locale]
  );

  if (authLoading) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className="visually-hidden">{t('events.myEvents.title')}</h1>
        <MyEventsSkeleton label={t('events.myEvents.loadingDetail')} />
      </PageLayout>
    );
  }

  if (!user && authCheckFailed) {
    return <SessionCheckErrorState />;
  }

  if (!user) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className={styles.pageTitle}>{t('events.myEvents.title')}</h1>
        <SignedOutState
          icon={<CalendarPlus size={26} aria-hidden />}
          title={t('events.myEvents.signedOutTitle')}
          message={t('events.myEvents.signedOutMessage')}
          returnTo={ROUTES.myEvents}
        />
      </PageLayout>
    );
  }

  if (activeQuery.isLoading) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className="visually-hidden">{t('events.myEvents.title')}</h1>
        <MyEventsSkeleton label={t('events.myEvents.loadingDetail')} />
      </PageLayout>
    );
  }

  if (activeQuery.isError) {
    const is401 = ApiError.is(activeQuery.error) && activeQuery.error.code === 401;
    return (
      <PageLayout className={styles.layout}>
        <h1 className="visually-hidden">{t('events.myEvents.title')}</h1>
        <EmptyState
          icon={<CalendarPlus size={26} aria-hidden />}
          title={t('events.myEvents.loadErrorTitle')}
          message={getErrorMessage(activeQuery.error, t('events.myEvents.fallbackError'))}
          actions={
            is401 ? (
              <Link to={withReturnTo(ROUTES.login, ROUTES.myEvents)}>
                {t('events.myEvents.reconnectLink')}
              </Link>
            ) : (
              <Button type="button" variant="primary" onClick={() => activeQuery.refetch()}>
                {t('common.retry')}
              </Button>
            )
          }
        />
      </PageLayout>
    );
  }

  const isGloballyEmpty = totalActive === 0 && totalFinished === 0;

  return (
    <PageLayout className={styles.layout}>
      <h1 className={styles.pageTitle}>{t('events.myEvents.title')}</h1>

      {isGloballyEmpty ? (
        <EmptyState
          icon={<CalendarPlus size={26} aria-hidden />}
          title={t('events.myEvents.emptyTitle')}
          message={t('events.myEvents.emptyDescription')}
          actions={
            <Link to={ROUTES.createEvent} className={buttonClass({ variant: 'primary' })}>
              {t('events.myEvents.createCta')}
            </Link>
          }
        />
      ) : (
        <>
          <div
            className={styles.tabs}
            role="tablist"
            tabIndex={-1}
            aria-label={t('events.myEvents.title')}
            onKeyDown={tablist.onKeyDown}
          >
            <button
              ref={tablist.registerTab('active')}
              type="button"
              role="tab"
              id="myevents-tab-active"
              aria-selected={tab === 'active'}
              aria-controls="myevents-panel-active"
              tabIndex={tablist.tabIndexFor('active')}
              className={clsx(styles.tab, tab === 'active' && styles.tabActive)}
              onClick={() => setTab('active')}
            >
              {t('events.myEvents.activesTab')}
              <span className={styles.tabCount}>{totalActive}</span>
            </button>
            <button
              ref={tablist.registerTab('history')}
              type="button"
              role="tab"
              id="myevents-tab-history"
              aria-selected={tab === 'history'}
              aria-controls="myevents-panel-history"
              tabIndex={tablist.tabIndexFor('history')}
              className={clsx(styles.tab, tab === 'history' && styles.tabActive)}
              onClick={() => setTab('history')}
            >
              {t('events.myEvents.historySection')}
              <span className={styles.tabCount}>{totalFinished}</span>
            </button>
          </div>

          {tab === 'active' ? (
            <div role="tabpanel" id="myevents-panel-active" aria-labelledby="myevents-tab-active">
              {leaveError ? (
                <p className="error" role="alert">
                  {leaveError}
                </p>
              ) : null}
              {closeError ? (
                <p className="error" role="alert">
                  {closeError}
                </p>
              ) : null}

              {totalActive === 0 ? (
                <EmptyState
                  icon={<CalendarPlus size={26} aria-hidden />}
                  title={t('events.myEvents.activeEmptyTitle')}
                  message={t('events.myEvents.activeEmpty')}
                  actions={
                    <>
                      <Link to={ROUTES.createEvent} className={buttonClass({ variant: 'primary' })}>
                        {t('events.myEvents.createCta')}
                      </Link>
                      <Link to={ROUTES.watchlist} className={buttonClass({ variant: 'ghost' })}>
                        {t('events.myEvents.discoverWatchlistCta')}
                      </Link>
                    </>
                  }
                />
              ) : (
                <div className={styles.activeLayout}>
                  <PendingEventsSection
                    events={pendingEvents}
                    onCloseWithoutMovie={(slug) => {
                      const ev = pendingEvents.find((e) => e.slug === slug);
                      setCloseError(null);
                      setConfirmClose({ slug, title: ev?.title ?? '' });
                    }}
                    closingSlug={closeMutation.isPending ? (confirmClose?.slug ?? null) : null}
                  />
                  {upcomingEvents.length > 0 ? (
                    <section
                      className={styles.section}
                      aria-labelledby="my-events-upcoming-heading"
                    >
                      <h2 id="my-events-upcoming-heading" className={styles.sectionTitle}>
                        {t('events.myEvents.upcomingSectionTitle')}
                      </h2>
                      <ul className={styles.list}>
                        {upcomingEvents.map((ev) => (
                          <li key={ev.id} className={styles.item}>
                            <Link
                              to={ROUTES.eventDetail(ev.slug)}
                              className={clsx(
                                eventSummaryCardStyles.card,
                                !ev.isCreator && styles.linkWithKebab
                              )}
                            >
                              <EventSummaryCardBody event={ev} />
                            </Link>
                            {!ev.isCreator ? (
                              <EventCardMenu
                                title={ev.title}
                                className={styles.itemKebab}
                                onRemove={() => handleLeaveEvent(ev.slug)}
                                removeLabel={t('events.participants.leaveAction')}
                              />
                            ) : null}
                          </li>
                        ))}
                        <li className={styles.item}>
                          <Link to={ROUTES.createEvent} className={styles.ghostCard}>
                            <CalendarPlus aria-hidden size={22} />
                            <span>{t('events.myEvents.createCta')}</span>
                          </Link>
                        </li>
                      </ul>
                    </section>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <div role="tabpanel" id="myevents-panel-history" aria-labelledby="myevents-tab-history">
              {deleteError ? (
                <p className="error" role="alert">
                  {deleteError}
                </p>
              ) : null}
              {historyRemoveError ? (
                <p className="error" role="alert">
                  {historyRemoveError}
                </p>
              ) : null}

              {totalFinished === 0 ? (
                <EmptyState
                  icon={<History size={26} aria-hidden />}
                  title={t('events.myEvents.historyEmptyTitle')}
                  message={t('events.myEvents.historyEmpty')}
                />
              ) : (
                <div className={styles.historyLayout}>
                  <HistoryRecap totalFinished={totalFinished} />
                  <HistoryToolbar
                    search={historyToolbar.search}
                    onSearchChange={historyToolbar.setSearch}
                    sortBy={historyToolbar.sortBy}
                    sortDir={historyToolbar.sortDir}
                    onSetSort={historyToolbar.setSortBy}
                    filtersOpen={historyToolbar.filtersOpen}
                    onToggleFilters={() => historyToolbar.setFiltersOpen((v) => !v)}
                    filtersPanelId={HISTORY_FILTERS_PANEL_ID}
                    activeFilterCount={historyToolbar.activeFilterCount}
                    isFiltered={historyToolbar.isFiltered}
                    visibleCount={historyToolbar.visibleEvents.length}
                    totalCount={historyEvents.length}
                    onClearAll={historyToolbar.clearAllFilters}
                  />
                  {historyToolbar.filtersOpen ? (
                    <HistoryFiltersPanel
                      panelId={HISTORY_FILTERS_PANEL_ID}
                      roles={historyToolbar.roles}
                      onToggleRole={historyToolbar.toggleRole}
                      outcomes={historyToolbar.outcomes}
                      onToggleOutcome={historyToolbar.toggleOutcome}
                    />
                  ) : null}

                  {historyQuery.isLoading ? (
                    <p className="placeholder">{t('common.loading')}</p>
                  ) : historyEvents.length === 0 ? (
                    <EmptyState
                      compact
                      icon={<History size={22} aria-hidden />}
                      title={t('events.myEvents.searchNoResultsTitle')}
                      message={t('events.myEvents.searchNoResults', { query: historySearchQuery })}
                    />
                  ) : historyToolbar.visibleEvents.length === 0 ? (
                    <EmptyState
                      compact
                      icon={<History size={22} aria-hidden />}
                      title={t('events.myEvents.searchNoResultsTitle')}
                      message={t('events.myEvents.historyNoResultsForFilters')}
                    />
                  ) : (
                    <>
                      {historyToolbar.sortBy === 'date' ? (
                        monthGroups.map((group) => (
                          <section
                            key={group.key}
                            className={styles.monthSection}
                            aria-labelledby={`my-events-month-${group.key}`}
                          >
                            <div className={styles.monthHeading}>
                              <h2
                                id={`my-events-month-${group.key}`}
                                className={styles.sectionTitle}
                              >
                                {group.label}
                              </h2>
                              <span className={styles.monthRule} aria-hidden />
                              <span className={styles.monthCount}>
                                {group.events.length === 1
                                  ? t('events.myEvents.monthGroupCountOne')
                                  : t('events.myEvents.monthGroupCountMany', {
                                      count: group.events.length,
                                    })}
                              </span>
                            </div>
                            <div className={styles.historyList}>
                              {group.events.map((ev) => (
                                <HistoryEventRow
                                  key={ev.id}
                                  event={ev}
                                  onDelete={
                                    ev.isCreator
                                      ? () => {
                                          setDeleteError(null);
                                          setConfirmDeleteSlug(ev.slug);
                                        }
                                      : undefined
                                  }
                                  onRemove={
                                    !ev.isCreator
                                      ? () => handleHistoryRemove(ev.slug, ev.title)
                                      : undefined
                                  }
                                />
                              ))}
                            </div>
                          </section>
                        ))
                      ) : (
                        <div className={styles.historyList}>
                          {historyToolbar.visibleEvents.map((ev) => (
                            <HistoryEventRow
                              key={ev.id}
                              event={ev}
                              onDelete={
                                ev.isCreator
                                  ? () => {
                                      setDeleteError(null);
                                      setConfirmDeleteSlug(ev.slug);
                                    }
                                  : undefined
                              }
                              onRemove={
                                !ev.isCreator
                                  ? () => handleHistoryRemove(ev.slug, ev.title)
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      )}
                      {historyQuery.hasNextPage ? (
                        <button
                          type="button"
                          className={styles.loadMoreBtn}
                          onClick={() => historyQuery.fetchNextPage()}
                          disabled={historyQuery.isFetchingNextPage}
                        >
                          {historySearchQuery
                            ? t('events.myEvents.loadMore')
                            : t('events.myEvents.loadMoreCount', {
                                count: Math.max(totalFinished - historyEvents.length, 0),
                              })}
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

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
      <ConfirmDialog
        open={confirmHistoryRemove !== null}
        title={t('events.myEvents.historyRemoveConfirmTitle')}
        message={t('events.myEvents.historyRemoveConfirmMessage', {
          title: confirmHistoryRemove?.title ?? '',
        })}
        confirmLabel={t('events.myEvents.historyRemoveConfirmAction')}
        busy={historyRemoveMutation.isPending}
        onConfirm={() => {
          if (confirmHistoryRemove) historyRemoveMutation.mutate(confirmHistoryRemove);
        }}
        onCancel={() => {
          setConfirmHistoryRemove(null);
          setHistoryRemoveError(null);
        }}
      />
      <ConfirmDialog
        open={confirmClose !== null}
        title={t('events.wheel.closeWithoutMovieConfirmTitle')}
        message={t('events.wheel.closeWithoutMovieConfirmMessage', {
          title: confirmClose?.title ?? '',
        })}
        confirmLabel={t('events.wheel.closeWithoutMovieConfirmAction')}
        busy={closeMutation.isPending}
        onConfirm={() => {
          if (confirmClose) closeMutation.mutate(confirmClose.slug);
        }}
        onCancel={() => {
          setConfirmClose(null);
          setCloseError(null);
        }}
      />
    </PageLayout>
  );
}
