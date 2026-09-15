import { describe, it, expect } from 'vitest';
import { ROUTES, withReturnTo } from '@/app/routes';

describe('withReturnTo', () => {
  it('omits the returnTo parameter when the target is the root', () => {
    expect(withReturnTo(ROUTES.login, ROUTES.home)).toBe(ROUTES.login);
  });

  it('omits the returnTo parameter when it is empty', () => {
    expect(withReturnTo(ROUTES.login, '')).toBe(ROUTES.login);
  });

  it('adds the encoded returnTo for any other page', () => {
    expect(withReturnTo(ROUTES.login, ROUTES.watchlist)).toBe(
      `${ROUTES.login}?returnTo=${encodeURIComponent(ROUTES.watchlist)}`
    );
    expect(withReturnTo(ROUTES.login, ROUTES.myEvents)).toBe(
      `${ROUTES.login}?returnTo=${encodeURIComponent(ROUTES.myEvents)}`
    );
  });
});

describe('ROUTES', () => {
  it('sert la landing sur la racine et conserve /decouvrir pour la redirection', () => {
    expect(ROUTES.home).toBe('/');
    expect(ROUTES.howItWorks).toBe('/decouvrir');
    expect(ROUTES.howItWorks).not.toBe(ROUTES.home);
  });
});
