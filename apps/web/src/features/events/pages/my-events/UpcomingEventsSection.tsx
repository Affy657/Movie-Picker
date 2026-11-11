import { CalendarPlus } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import type { MyEventSummary } from '@/features/events/types';
import { useTranslation } from '@/shared/i18n';
import styles from '@/features/events/pages/MyEventsPage.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import UpcomingEventCard from './UpcomingEventCard';

function canLeaveNight(event: MyEventSummary): boolean {
  return !event.isCreator && (event.winnerMovies?.length ?? 0) === 0;
}

interface UpcomingEventsSectionProps {
  events: MyEventSummary[];
  onLeave: (slug: string) => void;
}

export default function UpcomingEventsSection({
  events,
  onLeave,
}: Readonly<UpcomingEventsSectionProps>) {
  const { t } = useTranslation();

  return (
    <section className={styles.section} aria-labelledby="my-events-upcoming-heading">
      <div className={styles.sectionHeading}>
        <h2 id="my-events-upcoming-heading" className={styles.sectionTitle}>
          {t('events.myEvents.upcomingSectionTitle')}
        </h2>
        <span className={styles.sectionCount}>{events.length}</span>
      </div>
      <ul className={styles.grid}>
        {events.map((ev) => (
          <li key={ev.id} className={styles.item}>
            <UpcomingEventCard
              event={ev}
              onLeave={canLeaveNight(ev) ? () => onLeave(ev.slug) : undefined}
            />
          </li>
        ))}
        <li className={styles.item}>
          <Link to={ROUTES.createEvent} className={styles.ghostCard}>
            <CalendarPlus aria-hidden size={ICON_SIZE['2xl']} />
            <span>{t('events.myEvents.createCta')}</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
