import { describe, it, expect } from 'vitest';
import { t } from '@/shared/i18n';
import { isPastEventDateTime, validateCreateEventDraft } from './createEventValidation';

describe('validateCreateEventDraft', () => {
  it('accepts a complete draft', () => {
    expect(
      validateCreateEventDraft({ title: 'Soirée', date: '2030-12-31', time: '20:00' }, t)
    ).toEqual({});
  });

  it('asks for a title, a date and a time when they are missing', () => {
    expect(validateCreateEventDraft({ title: '   ', date: '', time: '' }, t)).toEqual({
      title: 'Donnez un titre à la soirée.',
      date: 'Choisissez une date.',
      time: 'Choisissez une heure.',
    });
  });

  it('refuses a date or a time the browser could not parse', () => {
    expect(
      validateCreateEventDraft({ title: 'Soirée', date: '2030-13-45', time: '25:99' }, t)
    ).toEqual({ date: 'Choisissez une date.', time: 'Choisissez une heure.' });
  });
});

describe('isPastEventDateTime', () => {
  const now = new Date('2026-09-20T16:30:00Z');

  it('is true for a moment before now', () => {
    expect(isPastEventDateTime('2026-09-20', '18:00', now)).toBe(true);
    expect(isPastEventDateTime('2026-09-19', '23:00', now)).toBe(true);
  });

  it('is false for now or later, and for an incomplete date', () => {
    expect(isPastEventDateTime('2026-09-20', '18:30', now)).toBe(false);
    expect(isPastEventDateTime('2026-09-20', '21:00', now)).toBe(false);
    expect(isPastEventDateTime('', '21:00', now)).toBe(false);
    expect(isPastEventDateTime('2026-09-20', '', now)).toBe(false);
    expect(isPastEventDateTime('2026-02-30', '12:00', now)).toBe(false);
  });

  it('reads the date and time as Paris wall-clock time, whatever the browser time zone', () => {
    const montrealAfternoon = new Date('2026-09-24T19:00:00Z');
    expect(isPastEventDateTime('2026-09-24', '20:00', montrealAfternoon)).toBe(true);
    expect(isPastEventDateTime('2026-09-24', '21:30', montrealAfternoon)).toBe(false);

    const parisNewYearsEve = new Date('2026-12-31T22:45:00Z');
    expect(isPastEventDateTime('2026-12-31', '23:30', parisNewYearsEve)).toBe(true);
    expect(isPastEventDateTime('2027-01-01', '00:00', parisNewYearsEve)).toBe(false);
  });
});
