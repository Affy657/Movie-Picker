import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomCenteredUnit, randomIndex } from '@/shared/utils/random';

const UINT32_RANGE = 2 ** 32;

function stubDraws(draws: number[]): void {
  const queue = [...draws];
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
    const next = queue.shift();
    if (next === undefined) throw new Error('plus de tirages simulés');
    (array as Uint32Array)[0] = next;
    return array;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('randomIndex', () => {
  it('always returns 0 for a single-item list', () => {
    for (let i = 0; i < 50; i += 1) expect(randomIndex(1)).toBe(0);
  });

  it('reste dans [0, length) sur un grand nombre de tirages', () => {
    const length = 7;
    for (let i = 0; i < 2000; i += 1) {
      const index = randomIndex(length);
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(length);
    }
  });

  it('rejects the draws in the biased zone and draws again', () => {
    const length = 7;
    const unbiasedLimit = UINT32_RANGE - (UINT32_RANGE % length);
    stubDraws([unbiasedLimit, UINT32_RANGE - 1, 10]);
    expect(randomIndex(length)).toBe(10 % length);
    expect(crypto.getRandomValues).toHaveBeenCalledTimes(3);
  });

  it('accepts the last unbiased draw without drawing again', () => {
    const length = 7;
    const unbiasedLimit = UINT32_RANGE - (UINT32_RANGE % length);
    stubDraws([unbiasedLimit - 1]);
    expect(randomIndex(length)).toBe((unbiasedLimit - 1) % length);
    expect(crypto.getRandomValues).toHaveBeenCalledTimes(1);
  });
});

describe('randomCenteredUnit', () => {
  it('couvre exactement [-0.5, 0.5] aux bornes du tirage', () => {
    stubDraws([0, 0xffffffff]);
    expect(randomCenteredUnit()).toBe(-0.5);
    expect(randomCenteredUnit()).toBe(0.5);
  });

  it('reste dans [-0.5, 0.5]', () => {
    for (let i = 0; i < 500; i += 1) {
      const value = randomCenteredUnit();
      expect(value).toBeGreaterThanOrEqual(-0.5);
      expect(value).toBeLessThanOrEqual(0.5);
    }
  });
});
