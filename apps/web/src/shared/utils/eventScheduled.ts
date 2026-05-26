export function eventScheduledStartUtcMs(event: { date: string; time: string }): number | null {
  const ms = Date.parse(`${event.date}T${event.time}:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

export function formatEventStartInUserTimezone(
  date: string,
  time: string,
  locale?: string
): string | null {
  const ms = eventScheduledStartUtcMs({ date, time });
  if (ms === null) return null;
  const loc = locale ?? 'fr-FR';
  try {
    return new Intl.DateTimeFormat(loc, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return `${date} à ${time}`;
  }
}

export const EVENT_START_REMINDER_WINDOW_MINUTES = 30;

export type EventStartReminderState =
  | { visible: false }
  | { visible: true; line1: string; line2: string };

export function computeEventStartReminder(
  date: string,
  time: string,
  isFinished: boolean,
  nowMs: number,
  options?: { windowMinutes?: number }
): EventStartReminderState {
  if (isFinished) return { visible: false };
  const startMs = eventScheduledStartUtcMs({ date, time });
  if (startMs === null) return { visible: false };
  const delta = startMs - nowMs;
  const windowMs = (options?.windowMinutes ?? EVENT_START_REMINDER_WINDOW_MINUTES) * 60_000;
  if (delta <= 0 || delta > windowMs) return { visible: false };

  const formatted = formatEventStartInUserTimezone(date, time) ?? `${date} à ${time}`;
  let line1: string;
  if (delta < 60_000) {
    line1 = "La soirée commence dans moins d'une minute.";
  } else {
    const minutes = Math.ceil(delta / 60_000);
    line1 =
      minutes === 1
        ? 'La soirée commence dans 1 minute.'
        : `La soirée commence dans ${minutes} minutes.`;
  }
  const line2 = `Début prévu : ${formatted} (heure de votre appareil).`;
  return { visible: true, line1, line2 };
}
