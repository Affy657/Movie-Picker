import { describe, it, expect } from 'vitest';
import {
  formatMyEventsListDate,
  formatEventTime,
  formatEventDateLong,
} from './formatMyEventsListDate';

describe('formatMyEventsListDate', () => {
  it('formats in French', () => {
    expect(formatMyEventsListDate('2026-04-30', 'fr')).toMatch(/30/);
  });

  it('includes the abbreviated weekday', () => {
    const currentYear = new Date().getFullYear();
    const result = formatMyEventsListDate(`${currentYear}-04-15`, 'fr');
    expect(result).toBe('mer. 15 avr.');
  });

  it('includes the weekday on the English side', () => {
    const currentYear = new Date().getFullYear();
    const result = formatMyEventsListDate(`${currentYear}-04-15`, 'en');
    expect(result).toBe('Wed 15 Apr');
  });

  it('does not show the year when it is the current year', () => {
    const currentYear = new Date().getFullYear();
    const isoDate = `${currentYear}-06-15`;
    const result = formatMyEventsListDate(isoDate, 'fr');
    expect(result).not.toMatch(String(currentYear));
  });

  it('shows the year when it is a different year', () => {
    const nextYear = new Date().getFullYear() + 1;
    const result = formatMyEventsListDate(`${nextYear}-06-15`, 'fr');
    expect(result).toMatch(String(nextYear));
  });

  it('keeps the weekday when the year is shown', () => {
    const nextYear = new Date().getFullYear() + 1;
    const result = formatMyEventsListDate(`${nextYear}-04-15`, 'fr');
    expect(result).toBe(`jeu. 15 avr. ${nextYear}`);
  });

  it('returns raw string on invalid input', () => {
    expect(formatMyEventsListDate('nope', 'fr')).toBe('nope');
  });
});

describe('formatEventTime', () => {
  it('affiche heure ronde sans minutes', () => {
    expect(formatEventTime('20:00')).toBe('20h');
    expect(formatEventTime('08:00')).toBe('8h');
  });

  it('affiche heures et minutes si minutes non nulles', () => {
    expect(formatEventTime('20:30')).toBe('20h30');
    expect(formatEventTime('08:05')).toBe('8h05');
  });
});

describe('formatEventDateLong', () => {
  it('writes the day in full and the month abbreviated, without a year for the current year', () => {
    const currentYear = new Date().getFullYear();
    const result = formatEventDateLong(`${currentYear}-08-22`, '20:30', 'fr', 'à');
    expect(result).toMatch(/^\p{L}+ 22 août à 20h30$/u);
    expect(result).not.toContain(String(currentYear));
  });

  it('adds the year when it differs from the current year', () => {
    const nextYear = new Date().getFullYear() + 1;
    expect(formatEventDateLong(`${nextYear}-04-15`, '21:00', 'fr', 'à')).toContain(
      `avr. ${nextYear} à 21h`
    );
  });

  it('utilise le joignant fourni', () => {
    expect(formatEventDateLong('2030-12-20', '19:05', 'en', 'at')).toContain('at 19h05');
  });

  it('returns the raw string when the date is invalid', () => {
    expect(formatEventDateLong('nope', '20:00', 'fr', 'à')).toBe('nope');
  });

  it('writes the month in full and always the year when asked for a keepsake', () => {
    const currentYear = new Date().getFullYear();
    expect(
      formatEventDateLong(`${currentYear}-09-18`, '20:30', 'fr', 'à', { keepsake: true })
    ).toBe(
      `vendredi 18 septembre ${currentYear} à 20h30`.replace('vendredi', dayName(currentYear))
    );
    expect(formatEventDateLong('2026-09-18', '20:30', 'en', 'at', { keepsake: true })).toBe(
      'Friday, 18 September 2026 at 20h30'
    );
  });
});

function dayName(year: number): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(new Date(year, 8, 18));
}
