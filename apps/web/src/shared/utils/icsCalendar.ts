import { parseEventLocalStartMs } from '@/shared/utils/eventScheduleLocal';

export const DEFAULT_EVENT_DURATION_MINUTES = 120;

const ICS_LINE_LIMIT = 74;

export interface CalendarEvent {
  title: string;
  date: string;
  time: string;
  url?: string;
  description?: string;
  durationMinutes?: number;
}

interface EventRange {
  start: Date;
  end: Date;
}

function resolveRange(event: CalendarEvent): EventRange | null {
  const startMs = parseEventLocalStartMs(event.date, event.time);
  if (startMs == null) return null;
  const minutes = event.durationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES;
  return { start: new Date(startMs), end: new Date(startMs + minutes * 60_000) };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatLocalStamp(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function formatUtcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function formatIsoLocal(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function slugForUid(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'soiree';
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll(/\\/g, String.raw`\\`)
    .replaceAll(/;/g, String.raw`\;`)
    .replaceAll(/,/g, String.raw`\,`)
    .replaceAll(/\r?\n/g, String.raw`\n`);
}

function foldIcsLine(line: string): string {
  const chars = Array.from(line);
  if (chars.length <= ICS_LINE_LIMIT) return line;
  const parts: string[] = [];
  for (let index = 0; index < chars.length; index += ICS_LINE_LIMIT) {
    parts.push(chars.slice(index, index + ICS_LINE_LIMIT).join(''));
  }
  return parts.join('\r\n ');
}

export function buildIcsContent(event: CalendarEvent, now: Date = new Date()): string | null {
  const range = resolveRange(event);
  if (!range) return null;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Movie Picker//Calendar//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${slugForUid(event.url ?? event.title)}@movie-picker`,
    `DTSTAMP:${formatUtcStamp(now)}`,
    `DTSTART:${formatLocalStamp(range.start)}`,
    `DTEND:${formatLocalStamp(range.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.url) {
    lines.push(`URL:${event.url}`);
    lines.push(`LOCATION:${escapeIcsText(event.url)}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

export function googleCalendarUrl(event: CalendarEvent): string | null {
  const range = resolveRange(event);
  if (!range) return null;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatLocalStamp(range.start)}/${formatLocalStamp(range.end)}`,
  });
  if (event.description) params.set('details', event.description);
  if (event.url) params.set('location', event.url);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(event: CalendarEvent): string | null {
  const range = resolveRange(event);
  if (!range) return null;

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: formatIsoLocal(range.start),
    enddt: formatIsoLocal(range.end),
  });
  if (event.description) params.set('body', event.description);
  if (event.url) params.set('location', event.url);

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function calendarFileName(event: CalendarEvent): string {
  return `movie-picker-${slugForUid(event.title)}.ics`;
}
