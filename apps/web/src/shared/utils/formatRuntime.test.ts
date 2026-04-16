import { describe, it, expect } from 'vitest';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';

describe('formatRuntimeMinutes', () => {
  it('retourne null pour null / undefined / NaN / Infinity / ≤ 0', () => {
    expect(formatRuntimeMinutes(null)).toBeNull();
    expect(formatRuntimeMinutes(undefined)).toBeNull();
    expect(formatRuntimeMinutes(NaN)).toBeNull();
    expect(formatRuntimeMinutes(Infinity)).toBeNull();
    expect(formatRuntimeMinutes(0)).toBeNull();
    expect(formatRuntimeMinutes(-10)).toBeNull();
  });

  it('formate une durée < 1h en minutes', () => {
    expect(formatRuntimeMinutes(45)).toBe('45min');
    expect(formatRuntimeMinutes(59)).toBe('59min');
  });

  it('formate une heure pile sans minutes', () => {
    expect(formatRuntimeMinutes(60)).toBe('1h');
    expect(formatRuntimeMinutes(120)).toBe('2h');
  });

  it('formate heures + minutes avec minutes sur 2 chiffres', () => {
    expect(formatRuntimeMinutes(70)).toBe('1h10');
    expect(formatRuntimeMinutes(65)).toBe('1h05');
    expect(formatRuntimeMinutes(125)).toBe('2h05');
    expect(formatRuntimeMinutes(148)).toBe('2h28');
  });

  it('tronque les décimales', () => {
    expect(formatRuntimeMinutes(70.9)).toBe('1h10');
  });
});
