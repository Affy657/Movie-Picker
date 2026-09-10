import { describe, it, expect } from 'vitest';
import { ROUTES } from '@/app/routes';
import {
  PRERENDERED_FOR_FIRST_PAINT_ONLY,
  PRERENDERED_ROUTE_CHUNKS,
  PRERENDERED_ROUTES,
} from '@/app/prerenderRoutes';

const PRIVATE_ROUTES = [
  ROUTES.account,
  ROUTES.myEvents,
  ROUTES.watchlist,
  ROUTES.notifications,
  ROUTES.login,
  ROUTES.register,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.oauthCallback,
  ROUTES.createEvent,
];

describe('PRERENDERED_ROUTES', () => {
  it('ne contient que des chemins statiques déclarés dans ROUTES', () => {
    const staticRoutes = Object.values<unknown>(ROUTES).filter(
      (value) => typeof value === 'string' && !value.includes(':')
    );
    for (const route of PRERENDERED_ROUTES) expect(staticRoutes).toContain(route);
  });

  it('ne contient aucun gabarit de route dynamique', () => {
    for (const route of PRERENDERED_ROUTES) expect(route).not.toContain(':');
  });

  it('ne contient aucune route privée ou authentifiée', () => {
    for (const route of PRERENDERED_ROUTES) expect(PRIVATE_ROUTES).not.toContain(route);
  });

  it("laisse la page d'accueil hors du prérendu", () => {
    expect(PRERENDERED_ROUTES).not.toContain(ROUTES.home);
  });

  it('ne contient aucun doublon', () => {
    expect(new Set(PRERENDERED_ROUTES).size).toBe(PRERENDERED_ROUTES.length);
  });

  it('donne à chaque route le nom du chunk dont le document doit porter les styles', () => {
    for (const route of PRERENDERED_ROUTES) {
      expect(PRERENDERED_ROUTE_CHUNKS[route]).toBeTruthy();
    }
    expect(Object.keys(PRERENDERED_ROUTE_CHUNKS).sort()).toEqual([...PRERENDERED_ROUTES].sort());
  });

  it('ne dispense du référencement que des routes effectivement prérendues', () => {
    for (const route of PRERENDERED_FOR_FIRST_PAINT_ONLY) {
      expect(PRERENDERED_ROUTES).toContain(route);
    }
  });
});
