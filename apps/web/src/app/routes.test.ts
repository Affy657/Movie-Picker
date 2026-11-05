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

  it('gives a night a short recap address and a rating link that can name the movie', () => {
    expect(ROUTES.nightRecapPattern).toBe('/r/:slug');
    expect(ROUTES.nightRecap('7fKq2p')).toBe('/r/7fKq2p');
    expect(ROUTES.eventDetailRating('7fKq2p')).toBe('/e/7fKq2p?rate');
    expect(ROUTES.eventDetailRating('7fKq2p', 'abc123')).toBe('/e/7fKq2p?rate=abc123');
  });
});
