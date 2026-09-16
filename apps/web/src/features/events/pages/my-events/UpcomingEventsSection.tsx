import clsx from 'clsx';
import { CalendarPlus } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import EventCardMenu from '@/features/events/components/EventCardMenu';
import {
  EventSummaryCardBody,
  eventSummaryCardStyles,
} from '@/features/events/components/EventSummaryCard';
import type { MyEventSummary } from '@/features/events/types';
import { useTranslation } from '@/shared/i18n';
import styles from '@/features/events/pages/MyEventsPage.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

interface UpcomingEventsSectionProps {
  events: MyEventSummary[];
  onLeave: (slug: string) => void;
}

export default function UpcomingEventsSection({
  events,
  onLeave,
}: Readonly<UpcomingEventsSectionProps>) {
  const { t } = useTranslation();

  if (events.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="my-events-upcoming-heading">
      <h2 id="my-events-upcoming-heading" className={styles.sectionTitle}>
        {t('events.myEvents.upcomingSectionTitle')}
      </h2>
      <ul className={styles.list}>
        {events.map((ev) => (
          <li key={ev.id} className={styles.item}>
            <Link
              to={ROUTES.eventDetail(ev.slug)}
              className={clsx(eventSummaryCardStyles.card, !ev.isCreator && styles.linkWithKebab)}
            >
              <EventSummaryCardBody event={ev} />
            </Link>
            {!ev.isCreator ? (
              <EventCardMenu
                title={ev.title}
                className={styles.itemKebab}
                onRemove={() => onLeave(ev.slug)}
                removeLabel={t('events.participants.leaveAction')}
              />
            ) : null}
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
