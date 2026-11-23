import { describe, it, expect } from 'vitest';
import { t } from '@/shared/i18n';
import {
  earliestOpenStartLocal,
  eventStartIssue,
  isPastEventDateTime,
  latestEventDate,
  validateCreateEventDraft,
} from './createEventValidation';

const auditDay = new Date('2026-11-23T12:00:00Z');

describe('validateCreateEventDraft', () => {
  it('accepts a complete draft', () => {
    expect(
      validateCreateEventDraft({ title: 'Soirée', date: '2026-12-31', time: '20:00' }, t, auditDay)
    ).toEqual({});
  });

  it('blocks a date before the automatic closing window, even typed on the keyboard', () => {
    expect(
      validateCreateEventDraft({ title: 'Soirée', date: '2025-12-04', time: '20:00' }, t, auditDay)
    ).toEqual({ date: 'Cette date est trop ancienne : la soirée serait aussitôt terminée.' });
    expect(
      validateCreateEventDraft({ title: 'Soirée', date: '2026-11-16', time: '10:00' }, t, auditDay)
    ).toEqual({ date: 'Cette date est trop ancienne : la soirée serait aussitôt terminée.' });
  });

  it('keeps a recent past date that only leaves the night pending', () => {
    expect(
      validateCreateEventDraft({ title: 'Soirée', date: '2026-11-16', time: '20:00' }, t, auditDay)
    ).toEqual({});
  });

  it('blocks a date more than two years ahead', () => {
    expect(
      validateCreateEventDraft({ title: 'Soirée', date: '2028-11-24', time: '20:00' }, t, auditDay)
    ).toEqual({ date: 'Une soirée se prévoit au plus 2 ans à l’avance.' });
    expect(
      validateCreateEventDraft({ title: 'Soirée', date: '2028-11-23', time: '20:00' }, t, auditDay)
    ).toEqual({});
  });

  it('asks for a title, a date and a time when they are missing', () => {
    expect(validateCreateEventDraft({ title: '   ', date: '', time: '' }, t, auditDay)).toEqual({
      title: 'Donnez un titre à la soirée.',
      date: 'Choisissez une date.',
      time: 'Choisissez une heure.',
    });
  });

  it('refuses a date or a time the browser could not parse', () => {
    expect(
      validateCreateEventDraft({ title: 'Soirée', date: '2030-13-45', time: '25:99' }, t, auditDay)
    ).toEqual({ date: 'Choisissez une date.', time: 'Choisissez une heure.' });
    expect(
      validateCreateEventDraft(
        { title: 'Soirée', date: '200494-12-04', time: '20:00' },
        t,
        auditDay
      )
    ).toEqual({ date: 'Choisissez une date.' });
  });
});

describe('eventStartIssue', () => {
  it('names the side of the window a start falls out of', () => {
    expect(eventStartIssue('1900-01-01', '20:00', auditDay)).toBe('tooEarly');
    expect(eventStartIssue('9999-12-31', '20:00', auditDay)).toBe('tooFar');
    expect(eventStartIssue('2026-11-23', '11:00', auditDay)).toBeNull();
    expect(eventStartIssue('', '20:00', auditDay)).toBeNull();
  });
});

describe('window bounds', () => {
  it('gives the last day a night can be planned on, in Paris', () => {
    expect(latestEventDate(auditDay)).toBe('2028-11-23');
    expect(latestEventDate(new Date('2026-12-31T23:30:00Z'))).toBe('2029-01-01');
  });

  it('gives the earliest start that still leaves the night open, as Paris wall-clock time', () => {
    expect(earliestOpenStartLocal(auditDay)).toBe('2026-11-16T11:01');
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
