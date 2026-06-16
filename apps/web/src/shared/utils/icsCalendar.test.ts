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
  it('buildIcsContent produit un VEVENT valide avec heure locale flottante', () => {
    const ics = buildIcsContent(baseEvent, FIXED_NOW);
    expect(ics).not.toBeNull();
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('DTSTART:20260615T190000');
    expect(ics).toContain('DTSTAMP:20260610T080000Z');
    expect(ics).toContain('SUMMARY:Soirée ciné');
    expect(ics).toContain('URL:https://moviepicker.app/e/abc');
    expect(ics?.endsWith('\r\n')).toBe(true);
  });

  it('buildIcsContent applique une durée par défaut de 2h sur DTEND', () => {
    const ics = buildIcsContent(baseEvent, FIXED_NOW);
    expect(ics).toContain('DTEND:20260615T210000');
  });

  it('buildIcsContent respecte une durée personnalisée', () => {
    const ics = buildIcsContent({ ...baseEvent, durationMinutes: 90 }, FIXED_NOW);
    expect(ics).toContain('DTSTART:20260615T190000');
    expect(ics).toContain('DTEND:20260615T203000');
  });

  it('buildIcsContent échappe les caractères spéciaux du titre', () => {
    const ics = buildIcsContent({ ...baseEvent, title: 'Ciné; pizza, popcorn' }, FIXED_NOW);
    expect(ics).toContain('SUMMARY:Ciné\\; pizza\\, popcorn');
  });

  it("buildIcsContent garde un UID stable quand seule l'heure change (mise à jour, pas doublon)", () => {
    const a = buildIcsContent(baseEvent, FIXED_NOW);
    const b = buildIcsContent({ ...baseEvent, time: '21:30' }, FIXED_NOW);
    const uid = /UID:(.+)/.exec(a ?? '')?.[1];
    expect(uid).toBeTruthy();
    expect(b).toContain(`UID:${uid}`);
  });

  it("buildIcsContent n'échappe pas la propriété URL mais échappe LOCATION", () => {
    const ics = buildIcsContent({ ...baseEvent, url: 'https://moviepicker.app/e/a,b' }, FIXED_NOW);
    expect(ics).toContain('URL:https://moviepicker.app/e/a,b');
    expect(ics).toContain('LOCATION:https://moviepicker.app/e/a\\,b');
  });

  it('buildIcsContent retourne null pour une date invalide', () => {
    expect(buildIcsContent({ ...baseEvent, date: '' }, FIXED_NOW)).toBeNull();
    expect(buildIcsContent({ ...baseEvent, date: 'pas-une-date' }, FIXED_NOW)).toBeNull();
  });

  it('googleCalendarUrl pointe vers Google avec titre et plage de dates', () => {
    const url = googleCalendarUrl(baseEvent);
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.origin + parsed.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
    expect(parsed.searchParams.get('text')).toBe('Soirée ciné');
    expect(parsed.searchParams.get('dates')).toBe('20260615T190000/20260615T210000');
    expect(parsed.searchParams.get('location')).toBe('https://moviepicker.app/e/abc');
  });

  it('outlookCalendarUrl pointe vers Outlook avec sujet et dates ISO locales', () => {
    const url = outlookCalendarUrl(baseEvent);
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.origin + parsed.pathname).toBe(
      'https://outlook.live.com/calendar/0/deeplink/compose'
    );
    expect(parsed.searchParams.get('rru')).toBe('addevent');
    expect(parsed.searchParams.get('subject')).toBe('Soirée ciné');
    expect(parsed.searchParams.get('startdt')).toBe('2026-06-15T19:00:00');
    expect(parsed.searchParams.get('enddt')).toBe('2026-06-15T21:00:00');
  });

  it('les liens web retournent null pour une date invalide', () => {
    expect(googleCalendarUrl({ ...baseEvent, date: '' })).toBeNull();
    expect(outlookCalendarUrl({ ...baseEvent, date: '' })).toBeNull();
  });

  it('calendarFileName produit un nom de fichier .ics slugifié', () => {
    expect(calendarFileName(baseEvent)).toBe('movie-picker-soiree-cine.ics');
    expect(calendarFileName({ ...baseEvent, title: '' })).toBe('movie-picker-soiree.ics');
  });
});
