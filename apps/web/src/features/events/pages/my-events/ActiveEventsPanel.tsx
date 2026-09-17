import { CalendarPlus } from 'lucide-react';
import { TabPanel } from '@/shared/components/Tabs';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import EmptyState from '@/shared/components/EmptyState';
import { buttonClass } from '@/shared/components/Button';
import type { MyEventSummary } from '@/features/events/types';
import { useTranslation } from '@/shared/i18n';
import PendingEventsSection from './PendingEventsSection';
import UpcomingEventsSection from './UpcomingEventsSection';
import type { MyEventsActions } from './useMyEventsActions';
import styles from '@/features/events/pages/MyEventsPage.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

interface ActiveEventsPanelProps {
  totalActive: number;
  pendingEvents: MyEventSummary[];
  upcomingEvents: MyEventSummary[];
  actions: MyEventsActions;
}

function ActiveEventsEmpty() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<CalendarPlus size={ICON_SIZE['3xl']} aria-hidden />}
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
  );
}

export default function ActiveEventsPanel({
  totalActive,
  pendingEvents,
  upcomingEvents,
  actions,
}: Readonly<ActiveEventsPanelProps>) {
  const closingSlug = actions.closeMutation.isPending ? (actions.confirmClose?.slug ?? null) : null;

  return (
    <TabPanel idBase="myevents" tabKey="active" active>
      {actions.leaveError ? (
        <p className="error" role="alert">
          {actions.leaveError}
        </p>
      ) : null}
      {actions.closeError ? (
        <p className="error" role="alert">
          {actions.closeError}
        </p>
      ) : null}

      {totalActive === 0 ? (
        <ActiveEventsEmpty />
      ) : (
        <div className={styles.activeLayout}>
          <PendingEventsSection
            events={pendingEvents}
            onCloseWithoutMovie={(slug) => {
              const title = pendingEvents.find((e) => e.slug === slug)?.title ?? '';
              actions.handleCloseWithoutMovie(slug, title);
            }}
            closingSlug={closingSlug}
          />
          <UpcomingEventsSection events={upcomingEvents} onLeave={actions.handleLeaveEvent} />
        </div>
      )}
    </TabPanel>
  );
}
