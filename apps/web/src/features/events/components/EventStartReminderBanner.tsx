import { useEffect, useState } from 'react';
import {
  computeEventStartReminder,
  eventScheduledStartUtcMs,
  EVENT_START_REMINDER_WINDOW_MINUTES,
} from '@/shared/utils/eventScheduled';
import styles from './EventStartReminderBanner.module.css';

const TICK_MS = 30_000;
/** Limite `setTimeout` (même ordre de grandeur que partout ailleurs dans le front). */
const MAX_TIMEOUT_MS = 2_147_483_647;

type Props = {
  date: string;
  time: string;
  isFinished: boolean;
};

/**
 * Rappel in-app sur la page soirée (V1 §16) : pas de push / e-mail.
 * Minuteur minimal : attente jusqu’à l’entrée dans la fenêtre, puis tick jusqu’au début.
 */
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
      <strong className={styles.kicker}>Bientôt</strong>
      <p className={styles.text}>{state.line1}</p>
      <p className={`${styles.meta} hint`}>{state.line2}</p>
    </aside>
  );
}
