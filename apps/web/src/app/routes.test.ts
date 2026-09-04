import { describe, it, expect } from 'vitest';
import { ROUTES, withReturnTo } from '@/app/routes';

describe('withReturnTo', () => {
  it('omet le paramètre returnTo quand la cible est la racine', () => {
    expect(withReturnTo(ROUTES.login, ROUTES.home)).toBe(ROUTES.login);
  });

  it('omet le paramètre returnTo quand il est vide', () => {
    expect(withReturnTo(ROUTES.login, '')).toBe(ROUTES.login);
  });

  it('ajoute le returnTo encodé pour toute autre page, y compris /decouvrir', () => {
    expect(withReturnTo(ROUTES.login, ROUTES.discover)).toBe(
      `${ROUTES.login}?returnTo=${encodeURIComponent(ROUTES.discover)}`
    );
    expect(withReturnTo(ROUTES.login, ROUTES.myEvents)).toBe(
      `${ROUTES.login}?returnTo=${encodeURIComponent(ROUTES.myEvents)}`
    );
  });
});

describe('ROUTES', () => {
  it('sépare la racine (home, redirection) de la landing publique indexable (discover)', () => {
    expect(ROUTES.home).toBe('/');
    expect(ROUTES.discover).toBe('/decouvrir');
    expect(ROUTES.discover).not.toBe(ROUTES.home);
  });
});
