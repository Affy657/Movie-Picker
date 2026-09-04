import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import PendingEventCard from '@/features/events/components/PendingEventCard';
import type { MyEventSummary } from '@/features/events/types';
import styles from './PendingEventsSection.module.css';

interface PendingEventsSectionProps {
  events: MyEventSummary[];
  onCloseWithoutMovie: (slug: string) => void;
  closingSlug: string | null;
}

export default function PendingEventsSection({
  events,
  onCloseWithoutMovie,
  closingSlug,
}: Readonly<PendingEventsSectionProps>) {
  const { t } = useTranslation();

  if (events.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="my-events-pending-heading">
      <h2 id="my-events-pending-heading" className={styles.heading}>
        <AlertTriangle aria-hidden size={14} />
        <span>{t('events.myEvents.toBeHandledSection')}</span>
      </h2>
      <div className={styles.list}>
        {events.map((ev) => (
          <PendingEventCard
            key={ev.id}
            event={ev}
            onCloseWithoutMovie={ev.isCreator ? () => onCloseWithoutMovie(ev.slug) : undefined}
            closing={closingSlug === ev.slug}
          />
        ))}
      </div>
    </section>
  );
}
