import { describe, expect, it } from 'vitest';
import { remainingWheelRevealDelayMs, WHEEL_SPIN_DURATION_MS } from './wheelSpin';

describe('remainingWheelRevealDelayMs', () => {
  it('returns 0 outside a wheel draw', () => {
    expect(remainingWheelRevealDelayMs('manual', new Date().toISOString())).toBe(0);
    expect(remainingWheelRevealDelayMs('wheel', null)).toBe(0);
    expect(remainingWheelRevealDelayMs('wheel', 'not-a-date')).toBe(0);
  });

  it('waits for the end of the rotation from winnerPickedAt', () => {
    const now = Date.parse('2026-05-01T18:00:00.000Z');
    const pickedAt = '2026-05-01T17:59:55.000Z';
    expect(remainingWheelRevealDelayMs('wheel', pickedAt, now)).toBe(WHEEL_SPIN_DURATION_MS - 5000);
  });

  it('shows straight away when the delay has already elapsed', () => {
    const now = Date.parse('2026-05-01T18:00:10.000Z');
    const pickedAt = '2026-05-01T18:00:00.000Z';
    expect(remainingWheelRevealDelayMs('wheel', pickedAt, now)).toBe(0);
  });
});
