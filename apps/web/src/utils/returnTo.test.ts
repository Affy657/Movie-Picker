import { describe, it, expect } from 'vitest';
import { safeReturnTo } from './returnTo';

describe('safeReturnTo', () => {
  it('garde un chemin relatif interne', () => {
    expect(safeReturnTo('/mes-soirees')).toBe('/mes-soirees');
    expect(safeReturnTo('/a?x=1')).toBe('/a?x=1');
  });

  it('refuse les URLs ouvertes ou vides', () => {
    expect(safeReturnTo(null)).toBe('/');
    expect(safeReturnTo('')).toBe('/');
    expect(safeReturnTo('//evil')).toBe('/');
    expect(safeReturnTo('https://x')).toBe('/');
  });
});
