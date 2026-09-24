import { describe, it, expect } from 'vitest';
import {
  buildIcsContent,
  calendarFileName,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from '@/shared/utils/icsCalendar';

const FIXED_NOW = new Date('2026-06-10T08:00:00Z');

const baseEvent: CalendarEvent = {
  title: 'Soirée ciné',
  date: '2026-06-15',
  time: '19:00',
  url: 'https://moviepicker.app/e/abc',
};

describe('icsCalendar', () => {
  it('buildIcsContent writes a valid VEVENT starting at the Paris time, in UTC', () => {
    const ics = buildIcsContent(baseEvent, FIXED_NOW);
    expect(ics).not.toBeNull();
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('DTSTART:20260615T170000Z\r\n');
    expect(ics).toContain('DTSTAMP:20260610T080000Z');
    expect(ics).toContain('SUMMARY:Soirée ciné');
    expect(ics).toContain('URL:https://moviepicker.app/e/abc');
    expect(ics?.endsWith('\r\n')).toBe(true);
  });

  it('buildIcsContent applies a default 2 h duration to DTEND', () => {
    const ics = buildIcsContent(baseEvent, FIXED_NOW);
    expect(ics).toContain('DTEND:20260615T190000Z\r\n');
  });

  it('buildIcsContent honours a custom duration', () => {
    const ics = buildIcsContent({ ...baseEvent, durationMinutes: 90 }, FIXED_NOW);
    expect(ics).toContain('DTSTART:20260615T170000Z\r\n');
    expect(ics).toContain('DTEND:20260615T183000Z\r\n');
  });

  it('buildIcsContent follows the Paris winter offset and the day change it brings', () => {
    const ics = buildIcsContent({ ...baseEvent, date: '2026-12-15', time: '00:30' }, FIXED_NOW);
    expect(ics).toContain('DTSTART:20261214T233000Z\r\n');
    expect(ics).toContain('DTEND:20261215T013000Z\r\n');
  });

  it('buildIcsContent escapes the special characters of the title', () => {
    const ics = buildIcsContent({ ...baseEvent, title: 'Ciné; pizza, popcorn' }, FIXED_NOW);
    expect(ics).toContain('SUMMARY:Ciné\\; pizza\\, popcorn');
  });

  it('buildIcsContent keeps a stable UID when only the time changes (update, not duplicate)', () => {
    const a = buildIcsContent(baseEvent, FIXED_NOW);
    const b = buildIcsContent({ ...baseEvent, time: '21:30' }, FIXED_NOW);
    const uid = /UID:(.+)/.exec(a ?? '')?.[1];
    expect(uid).toBeTruthy();
    expect(b).toContain(`UID:${uid}`);
  });

  it('buildIcsContent does not escape the URL property but escapes LOCATION', () => {
    const ics = buildIcsContent({ ...baseEvent, url: 'https://moviepicker.app/e/a,b' }, FIXED_NOW);
    expect(ics).toContain('URL:https://moviepicker.app/e/a,b');
    expect(ics).toContain('LOCATION:https://moviepicker.app/e/a\\,b');
  });

  it('buildIcsContent never lets the title, the description or the URL open a new calendar property', () => {
    const ics = buildIcsContent(
      {
        ...baseEvent,
        title: 'Ciné\rATTENDEE:mailto:x@example.com\u{2028}X-TITLE:1',
        description:
          'Pizza\u{2028}ATTENDEE:mailto:y@example.com\rX-NOTE:1\u{85}X-NEL:1\u{2029}X-PAR:1',
        url: 'https://moviepicker.app/e/abc\r\nATTENDEE:mailto:x@example.com\nX-EXTRA:1\u{2028}X-URL:1',
      },
      FIXED_NOW
    );
    const unfolded = ics!.replaceAll('\r\n ', '');
    const propertyNames = unfolded.split('\r\n').map((line) => line.split(':')[0] ?? '');
    const injectedNames = ['ATTENDEE', 'X-TITLE', 'X-NOTE', 'X-NEL', 'X-PAR', 'X-EXTRA', 'X-URL'];

    expect(ics!.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/);
    expect(ics).not.toMatch(/[\u{85}\u{2028}\u{2029}]/u);
    expect(propertyNames.filter((name) => injectedNames.includes(name))).toEqual([]);
    expect(unfolded).toContain(String.raw`SUMMARY:Ciné\nATTENDEE:mailto:x@example.com\nX-TITLE:1`);
    expect(unfolded).toContain(
      String.raw`DESCRIPTION:Pizza\nATTENDEE:mailto:y@example.com\nX-NOTE:1\nX-NEL:1\nX-PAR:1`
    );
    expect(unfolded).toContain(
      'URL:https://moviepicker.app/e/abcATTENDEE:mailto:x@example.comX-EXTRA:1X-URL:1'
    );
  });

  it('buildIcsContent strips the control characters left in a text value', () => {
    const ics = buildIcsContent(
      { ...baseEvent, title: 'Ciné\u0000 pizza\u001b\u007f\u009b', description: 'a\u0007b\tc' },
      FIXED_NOW
    );

    expect(ics).toContain('SUMMARY:Ciné pizza\r\n');
    expect(ics).toContain('DESCRIPTION:abc\r\n');
  });

  it('buildIcsContent retourne null pour une date invalide', () => {
    expect(buildIcsContent({ ...baseEvent, date: '' }, FIXED_NOW)).toBeNull();
    expect(buildIcsContent({ ...baseEvent, date: 'pas-une-date' }, FIXED_NOW)).toBeNull();
  });

  it('googleCalendarUrl points to Google with the title and the UTC range of the Paris start', () => {
    const url = googleCalendarUrl(baseEvent);
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.origin + parsed.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
    expect(parsed.searchParams.get('text')).toBe('Soirée ciné');
    expect(parsed.searchParams.get('dates')).toBe('20260615T170000Z/20260615T190000Z');
    expect(parsed.searchParams.get('location')).toBe('https://moviepicker.app/e/abc');
  });

  it('outlookCalendarUrl points to Outlook with the subject and ISO dates in UTC', () => {
    const url = outlookCalendarUrl(baseEvent);
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.origin + parsed.pathname).toBe(
      'https://outlook.live.com/calendar/0/deeplink/compose'
    );
    expect(parsed.searchParams.get('rru')).toBe('addevent');
    expect(parsed.searchParams.get('subject')).toBe('Soirée ciné');
    expect(parsed.searchParams.get('startdt')).toBe('2026-06-15T17:00:00Z');
    expect(parsed.searchParams.get('enddt')).toBe('2026-06-15T19:00:00Z');
  });

  it('les liens web retournent null pour une date invalide', () => {
    expect(googleCalendarUrl({ ...baseEvent, date: '' })).toBeNull();
    expect(outlookCalendarUrl({ ...baseEvent, date: '' })).toBeNull();
  });

  it('calendarFileName produces a slugified .ics file name', () => {
    expect(calendarFileName(baseEvent)).toBe('movie-picker-soiree-cine.ics');
    expect(calendarFileName({ ...baseEvent, title: '' })).toBe('movie-picker-soiree.ics');
  });
});
