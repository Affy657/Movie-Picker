import { describe, it, expect } from 'vitest';
import { parseEventLocalStartMs } from '@/shared/utils/eventScheduleLocal';

describe('parseEventLocalStartMs', () => {
  it('retourne le timestamp local pour date + heure', () => {
    const ms = parseEventLocalStartMs('2030-06-15', '20:30');
    expect(ms).not.toBeNull();
    const d = new Date(ms!);
    expect(d.getFullYear()).toBe(2030);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(20);
    expect(d.getMinutes()).toBe(30);
  });

  it('retourne null pour une date invalide', () => {
    expect(parseEventLocalStartMs('not-a-date', '12:00')).toBeNull();
  });
});
