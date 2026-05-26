import { describe, it, expect } from 'vitest';
import { formatMyEventsListDate, formatEventTime } from './formatMyEventsListDate';

describe('formatMyEventsListDate', () => {
  it('formats in French', () => {
    expect(formatMyEventsListDate('2026-04-30', 'fr')).toMatch(/30/);
  });

  it("n'affiche pas l'année si c'est l'année courante", () => {
    const currentYear = new Date().getFullYear();
    const isoDate = `${currentYear}-06-15`;
    const result = formatMyEventsListDate(isoDate, 'fr');
    expect(result).not.toMatch(String(currentYear));
  });

  it("affiche l'année si c'est une année différente", () => {
    const nextYear = new Date().getFullYear() + 1;
    const result = formatMyEventsListDate(`${nextYear}-06-15`, 'fr');
    expect(result).toMatch(String(nextYear));
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
