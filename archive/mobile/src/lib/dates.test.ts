import { compareDayLocal, parseLocalDate } from './dates';

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD at local midnight (no UTC shift)', () => {
    const d = parseLocalDate('2026-06-15');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(5);
    expect(d!.getDate()).toBe(15);
    expect(d!.getHours()).toBe(0);
  });

  it('accepts an ISO datetime by taking the leading date', () => {
    const d = parseLocalDate('2026-06-15T10:30:00Z');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(5);
    expect(d!.getDate()).toBe(15);
  });

  it('returns null on null/undefined/empty', () => {
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate(undefined)).toBeNull();
    expect(parseLocalDate('')).toBeNull();
  });

  it('returns null on garbage input', () => {
    expect(parseLocalDate('not-a-date')).toBeNull();
  });
});

describe('compareDayLocal', () => {
  it('returns 0 when a and b are the same day (different times)', () => {
    const a = new Date(2026, 5, 15, 8, 0);
    const b = new Date(2026, 5, 15, 23, 59);
    expect(compareDayLocal(a, b)).toBe(0);
  });

  it('returns -1 when a is strictly before b', () => {
    const a = new Date(2026, 5, 14);
    const b = new Date(2026, 5, 15);
    expect(compareDayLocal(a, b)).toBe(-1);
  });

  it('returns 1 when a is strictly after b', () => {
    const a = new Date(2026, 5, 16);
    const b = new Date(2026, 5, 15);
    expect(compareDayLocal(a, b)).toBe(1);
  });
});
