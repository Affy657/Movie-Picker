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

  it('rejects protocol-relative variants hidden by a backslash', () => {
    expect(safeReturnTo('/\\evil.test')).toBe('/');
  });

  it('rejects the authentication pages to avoid a redirect loop', () => {
    expect(safeReturnTo('/login')).toBe('/');
    expect(safeReturnTo('/login?returnTo=%2Flogin')).toBe('/');
    expect(safeReturnTo('/register')).toBe('/');
    expect(safeReturnTo('/forgot-password')).toBe('/');
    expect(safeReturnTo('/reset?token=abc')).toBe('/');
  });

  it('rejects the authentication pages even with a trailing slash or a different case (react-router resolves them to the same route)', () => {
    expect(safeReturnTo('/login/')).toBe('/');
    expect(safeReturnTo('/Login')).toBe('/');
    expect(safeReturnTo('/LOGIN/')).toBe('/');
    expect(safeReturnTo('/register/')).toBe('/');
    expect(safeReturnTo('/reset//?token=abc')).toBe('/');
  });
});
