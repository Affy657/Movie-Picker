import { describe, it, expect } from 'vitest';
import { safeReturnTo } from '@/shared/utils/returnTo';

describe('safeReturnTo', () => {
  it('garde un chemin relatif interne', () => {
    expect(safeReturnTo('/my-events')).toBe('/my-events');
    expect(safeReturnTo('/a?x=1')).toBe('/a?x=1');
    expect(safeReturnTo('/e/soiree-secrete')).toBe('/e/soiree-secrete');
  });

  it('refuse les URLs ouvertes ou vides', () => {
    expect(safeReturnTo(null)).toBe('/');
    expect(safeReturnTo('')).toBe('/');
    expect(safeReturnTo('//evil')).toBe('/');
    expect(safeReturnTo('https://x')).toBe('/');
  });

  it('refuse les variantes protocol-relative masquées par un antislash', () => {
    expect(safeReturnTo('/\\evil.test')).toBe('/');
  });

  it("refuse les pages d'authentification pour éviter une boucle de redirection", () => {
    expect(safeReturnTo('/login')).toBe('/');
    expect(safeReturnTo('/login?returnTo=%2Flogin')).toBe('/');
    expect(safeReturnTo('/register')).toBe('/');
    expect(safeReturnTo('/forgot-password')).toBe('/');
    expect(safeReturnTo('/reset?token=abc')).toBe('/');
  });

  it("refuse les pages d'authentification même avec un slash final ou une casse différente (react-router les résout vers la même route)", () => {
    expect(safeReturnTo('/login/')).toBe('/');
    expect(safeReturnTo('/Login')).toBe('/');
    expect(safeReturnTo('/LOGIN/')).toBe('/');
    expect(safeReturnTo('/register/')).toBe('/');
    expect(safeReturnTo('/reset//?token=abc')).toBe('/');
  });
});
