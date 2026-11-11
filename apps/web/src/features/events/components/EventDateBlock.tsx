import clsx from 'clsx';
import { useLocale } from '@/shared/i18n';
import { eventDateParts } from '@/shared/utils/formatMyEventsListDate';
import styles from './EventDateBlock.module.css';

type EventDateBlockProps = {
  date: string;
  className?: string;
};

export default function EventDateBlock({ date, className }: Readonly<EventDateBlockProps>) {
  const { locale } = useLocale();
  const parts = eventDateParts(date, locale);
  if (!parts) return null;
  return (
    <span className={clsx(styles.block, className)} aria-hidden="true">
      <span className={styles.edge}>{parts.weekday}</span>
      <span className={styles.day}>{parts.day}</span>
      <span className={styles.edge}>{parts.month}</span>
    </span>
  );
}
