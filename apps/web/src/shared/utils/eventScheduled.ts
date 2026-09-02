const EVENT_TIMEZONE = 'Europe/Paris';

function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  );
  return asUtc - utcMs;
}

export function eventScheduledStartUtcMs(event: { date: string; time: string }): number | null {
  const guessMs = Date.parse(`${event.date}T${event.time}:00Z`);
  if (Number.isNaN(guessMs)) return null;
  return guessMs - timeZoneOffsetMs(guessMs, EVENT_TIMEZONE);
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
