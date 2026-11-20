import type { MyEventSummary } from '@/features/events/types';
import { UpcomingNightStatus } from '@/features/events/pages/my-events/UpcomingEventCard';
import styles from './NightStatusLine.module.css';

const STATUS_CLASSES = { status: styles.pill, action: styles.action, actionIcon: styles.icon };

export default function NightStatusLine({ night }: Readonly<{ night: MyEventSummary }>) {
  return <UpcomingNightStatus event={night} classNames={STATUS_CLASSES} />;
}
