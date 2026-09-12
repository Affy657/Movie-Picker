import type { MyEventSummary } from '@/features/events/types';
import HistoryEventRow from './HistoryEventRow';
import styles from '@/features/events/pages/MyEventsPage.module.css';

export interface HistoryEventHandlers {
  onDelete: (slug: string) => void;
  onRemove: (slug: string, title: string) => void;
  onReuse: (slug: string, title: string) => void;
}

interface HistoryEventListProps extends HistoryEventHandlers {
  events: MyEventSummary[];
}

export default function HistoryEventList({
  events,
  onDelete,
  onRemove,
  onReuse,
}: Readonly<HistoryEventListProps>) {
  return (
    <div className={styles.historyList}>
      {events.map((ev) => (
        <HistoryEventRow
          key={ev.id}
          event={ev}
          onDelete={ev.isCreator ? () => onDelete(ev.slug) : undefined}
          onRemove={ev.isCreator ? undefined : () => onRemove(ev.slug, ev.title)}
          onReuse={ev.isCreator ? () => onReuse(ev.slug, ev.title) : undefined}
        />
      ))}
    </div>
  );
}
