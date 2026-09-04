import { describe, expect, it } from 'vitest';
import { remainingWheelRevealDelayMs, WHEEL_SPIN_DURATION_MS } from './wheelSpin';

describe('remainingWheelRevealDelayMs', () => {
  it('retourne 0 hors tirage à la roue', () => {
    expect(remainingWheelRevealDelayMs('manual', new Date().toISOString())).toBe(0);
    expect(remainingWheelRevealDelayMs('wheel', null)).toBe(0);
    expect(remainingWheelRevealDelayMs('wheel', 'not-a-date')).toBe(0);
  });

  it('attend la fin de la rotation à partir de winnerPickedAt', () => {
    const now = Date.parse('2026-05-01T18:00:00.000Z');
    const pickedAt = '2026-05-01T17:59:55.000Z';
    expect(remainingWheelRevealDelayMs('wheel', pickedAt, now)).toBe(WHEEL_SPIN_DURATION_MS - 5000);
  });

  it('affiche tout de suite si le délai est déjà écoulé', () => {
    const now = Date.parse('2026-05-01T18:00:10.000Z');
    const pickedAt = '2026-05-01T18:00:00.000Z';
    expect(remainingWheelRevealDelayMs('wheel', pickedAt, now)).toBe(0);
  });
});
