import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import {
  computeEventStartReminder,
  eventScheduledStartUtcMs,
  EVENT_START_REMINDER_WINDOW_MINUTES,
} from '@/shared/utils/eventScheduled';
import styles from './EventStartReminderBanner.module.css';

const TICK_MS = 30_000;

const MAX_TIMEOUT_MS = 2_147_483_647;

type Props = {
  date: string;
  time: string;
  isFinished: boolean;
};

export default function EventStartReminderBanner({ date, time, isFinished }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (isFinished) return;
    const startMs = eventScheduledStartUtcMs({ date, time });
    if (startMs === null) return;

    let intervalId: number | undefined;
    let timeoutId: number | undefined;

    const refresh = () => setTick((n) => n + 1);

    const startPolling = () => {
      refresh();
      intervalId = window.setInterval(() => {
        refresh();
        if (Date.now() >= startMs && intervalId != null) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
      }, TICK_MS);
    };

    const now = Date.now();
    if (now >= startMs) return;

    const windowMs = EVENT_START_REMINDER_WINDOW_MINUTES * 60_000;
    const windowStart = startMs - windowMs;
    if (now < windowStart) {
      timeoutId = window.setTimeout(startPolling, Math.min(windowStart - now, MAX_TIMEOUT_MS));
    } else {
      startPolling();
    }

    return () => {
      if (timeoutId != null) clearTimeout(timeoutId);
      if (intervalId != null) clearInterval(intervalId);
    };
  }, [isFinished, date, time]);

  const state = computeEventStartReminder(date, time, isFinished, Date.now());
  if (!state.visible) return null;

  return (
    <aside className={styles.root} role="status" aria-live="polite">
      <span className={styles.iconWrap} aria-hidden>
        <Clock size={16} />
      </span>
      <div className={styles.body}>
        <strong className={styles.kicker}>Bientôt</strong>
        <p className={styles.text}>{state.line1}</p>
        <p className={styles.meta}>{state.line2}</p>
      </div>
    </aside>
  );
}
