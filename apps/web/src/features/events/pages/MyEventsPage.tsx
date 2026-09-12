import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import EmptyState from '@/shared/components/EmptyState';
import PageLayout from '@/shared/components/PageLayout';
import MyEventsSkeleton from '@/features/events/pages/MyEventsSkeleton';
import { ApiError, getErrorMessage } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation } from '@/shared/i18n';
import { withReturnTo, ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import ActiveEventsPanel from '@/features/events/pages/my-events/ActiveEventsPanel';
import HistoryEventsPanel from '@/features/events/pages/my-events/HistoryEventsPanel';
import MyEventsConfirmDialogs from '@/features/events/pages/my-events/MyEventsConfirmDialogs';
import MyEventsTabs, { type MyEventsTab } from '@/features/events/pages/my-events/MyEventsTabs';
import { useHistoryToolbar } from '@/features/events/pages/my-events/useHistoryToolbar';
import { useMyEventsActions } from '@/features/events/pages/my-events/useMyEventsActions';
import { useMyEventsLists } from '@/features/events/pages/my-events/useMyEventsLists';
import styles from './MyEventsPage.module.css';
import Button, { buttonClass } from '@/shared/components/Button';

const HISTORY_SEARCH_DEBOUNCE_MS = 300;

function MyEventsShell({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useTranslation();
  return (
    <PageLayout className={styles.layout}>
      <h1 className="visually-hidden">{t('events.myEvents.title')}</h1>
      {children}
    </PageLayout>
  );
}

function MyEventsLoadError({ error, onRetry }: Readonly<{ error: unknown; onRetry: () => void }>) {
  const { t } = useTranslation();
  const is401 = ApiError.is(error) && error.code === 401;
  return (
    <MyEventsShell>
      <EmptyState
        icon={<CalendarPlus size={26} aria-hidden />}
        title={t('events.myEvents.loadErrorTitle')}
        message={getErrorMessage(error, t('events.myEvents.fallbackError'))}
        actions={
          is401 ? (
            <Link to={withReturnTo(ROUTES.login, ROUTES.myEvents)}>
              {t('events.myEvents.reconnectLink')}
            </Link>
          ) : (
            <Button type="button" variant="primary" onClick={onRetry}>
              {t('common.retry')}
            </Button>
          )
        }
      />
    </MyEventsShell>
  );
}

function MyEventsGloballyEmpty() {
  const { t } = useTranslation();
  return (
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
  );
}

export default function MyEventsPage() {
  const { t } = useTranslation();
  useNoindexPage(pageTitle(t('events.myEvents.title')), ROUTES.myEvents);
  const { user, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: MyEventsTab = searchParams.get('tab') === 'history' ? 'history' : 'active';
  const setTab = useCallback(
    (next: MyEventsTab) => {
      setSearchParams(next === 'history' ? { tab: 'history' } : {}, { replace: true });
    },
    [setSearchParams]
  );

  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const actions = useMyEventsActions();
  const lists = useMyEventsLists({ enabled: !authLoading && !!user, tab, historySearchQuery });

  const historyToolbar = useHistoryToolbar({ events: lists.historyEvents });
  useEffect(() => {
    const id = setTimeout(
      () => setHistorySearchQuery(historyToolbar.search.trim()),
      HISTORY_SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(id);
  }, [historyToolbar.search]);

  if (authLoading || lists.activeQuery.isLoading) {
    return (
      <MyEventsShell>
        <MyEventsSkeleton label={t('events.myEvents.loadingDetail')} />
      </MyEventsShell>
    );
  }

  if (lists.activeQuery.isError) {
    return (
      <MyEventsLoadError
        error={lists.activeQuery.error}
        onRetry={() => void lists.activeQuery.refetch()}
      />
    );
  }

  const isGloballyEmpty = lists.totalActive === 0 && lists.totalFinished === 0;

  return (
    <PageLayout className={styles.layout}>
      <h1 className={styles.pageTitle}>{t('events.myEvents.title')}</h1>

      {isGloballyEmpty ? (
        <MyEventsGloballyEmpty />
      ) : (
        <>
          <MyEventsTabs
            tab={tab}
            onChange={setTab}
            totalActive={lists.totalActive}
            totalFinished={lists.totalFinished}
          />
          {tab === 'active' ? (
            <ActiveEventsPanel
              totalActive={lists.totalActive}
              pendingEvents={lists.pendingEvents}
              upcomingEvents={lists.upcomingEvents}
              actions={actions}
            />
          ) : (
            <HistoryEventsPanel
              totalFinished={lists.totalFinished}
              events={lists.historyEvents}
              searchQuery={historySearchQuery}
              query={lists.historyQuery}
              toolbar={historyToolbar}
              actions={actions}
            />
          )}
        </>
      )}

      <MyEventsConfirmDialogs actions={actions} historyEvents={lists.historyEvents} />
    </PageLayout>
  );
}
