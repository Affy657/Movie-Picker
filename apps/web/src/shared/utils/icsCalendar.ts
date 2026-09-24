import { eventScheduledStartUtcMs } from '@/shared/utils/eventScheduled';

export const DEFAULT_EVENT_DURATION_MINUTES = 120;

const ICS_LINE_OCTET_LIMIT = 75;
const ICS_CONTINUATION_PREFIX = ' ';

const utf8 = new TextEncoder();

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
  const startMs = eventScheduledStartUtcMs(event);
  if (startMs == null) return null;
  const minutes = event.durationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES;
  return { start: new Date(startMs), end: new Date(startMs + minutes * 60_000) };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatUtcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function formatIsoUtc(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
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

const LINE_BREAKS = /\r\n|[\r\n\u{85}\u{2028}\u{2029}]/gu;

function isControlOrLineSeparator(code: number): boolean {
  return code <= 0x1f || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029;
}

function withoutControlCharacters(value: string): string {
  return Array.from(value)
    .filter((char) => !isControlOrLineSeparator(char.codePointAt(0) ?? 0))
    .join('');
}

function escapeIcsText(value: string): string {
  return withoutControlCharacters(
    value
      .replaceAll('\\', String.raw`\\`)
      .replaceAll(';', String.raw`\;`)
      .replaceAll(',', String.raw`\,`)
      .replaceAll(LINE_BREAKS, String.raw`\n`)
  );
}

function foldIcsLine(line: string): string {
  if (utf8.encode(line).length <= ICS_LINE_OCTET_LIMIT) return line;
  const parts: string[] = [];
  let part = '';
  let partOctets = 0;
  let partBudget = ICS_LINE_OCTET_LIMIT;
  for (const codePoint of line) {
    const octets = utf8.encode(codePoint).length;
    if (partOctets + octets > partBudget) {
      parts.push(part);
      part = '';
      partOctets = 0;
      partBudget = ICS_LINE_OCTET_LIMIT - ICS_CONTINUATION_PREFIX.length;
    }
    part += codePoint;
    partOctets += octets;
  }
  parts.push(part);
  return parts.join(`\r\n${ICS_CONTINUATION_PREFIX}`);
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
    `DTSTART:${formatUtcStamp(range.start)}`,
    `DTEND:${formatUtcStamp(range.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.url) {
    lines.push(
      `URL:${withoutControlCharacters(event.url)}`,
      `LOCATION:${escapeIcsText(event.url)}`
    );
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
    dates: `${formatUtcStamp(range.start)}/${formatUtcStamp(range.end)}`,
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
    startdt: formatIsoUtc(range.start),
    enddt: formatIsoUtc(range.end),
  });
  if (event.description) params.set('body', event.description);
  if (event.url) params.set('location', event.url);

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function calendarFileName(event: CalendarEvent): string {
  return `movie-picker-${slugForUid(event.title)}.ics`;
}
