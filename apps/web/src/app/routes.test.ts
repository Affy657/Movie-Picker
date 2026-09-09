import { describe, it, expect } from 'vitest';
import { ROUTES, withReturnTo } from '@/app/routes';

describe('withReturnTo', () => {
  it('omet le paramètre returnTo quand la cible est la racine', () => {
    expect(withReturnTo(ROUTES.login, ROUTES.home)).toBe(ROUTES.login);
  });

  it('omet le paramètre returnTo quand il est vide', () => {
    expect(withReturnTo(ROUTES.login, '')).toBe(ROUTES.login);
  });

  it('ajoute le returnTo encodé pour toute autre page', () => {
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
