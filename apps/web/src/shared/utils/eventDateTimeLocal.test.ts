import { describe, it, expect } from 'vitest';
import {
  datetimeLocalToEndDatePayload,
  isoToDatetimeLocalValue,
} from '@/shared/utils/eventDateTimeLocal';

describe('eventDateTimeLocal', () => {
  it('isoToDatetimeLocalValue retourne vide pour entrée vide', () => {
    expect(isoToDatetimeLocalValue(null)).toBe('');
    expect(isoToDatetimeLocalValue('')).toBe('');
  });

  it('datetimeLocalToEndDatePayload vide reste vide pour effacer', () => {
    expect(datetimeLocalToEndDatePayload('')).toBe('');
    expect(datetimeLocalToEndDatePayload('  ')).toBe('');
  });

  it('boucle ISO → local → payload conserve une date valide', () => {
    const iso = '2030-06-15T14:30:00.000Z';
    const local = isoToDatetimeLocalValue(iso);
    expect(local.length).toBeGreaterThan(10);
    const back = datetimeLocalToEndDatePayload(local);
    expect(back).toMatch(/2030-06-15/);
  });
});
