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
  it('contains only static paths declared in ROUTES', () => {
    const staticRoutes = Object.values<unknown>(ROUTES).filter(
      (value) => typeof value === 'string' && !value.includes(':')
    );
    for (const route of PRERENDERED_ROUTES) expect(staticRoutes).toContain(route);
  });

  it('ne contient aucun gabarit de route dynamique', () => {
    for (const route of PRERENDERED_ROUTES) expect(route).not.toContain(':');
  });

  it('contains no private or authenticated route', () => {
    for (const route of PRERENDERED_ROUTES) expect(PRIVATE_ROUTES).not.toContain(route);
  });

  it('leaves the home page out of the prerendering', () => {
    expect(PRERENDERED_ROUTES).not.toContain(ROUTES.home);
  });

  it('ne contient aucun doublon', () => {
    expect(new Set(PRERENDERED_ROUTES).size).toBe(PRERENDERED_ROUTES.length);
  });

  it('gives every route the name of the chunk whose styles the document must carry', () => {
    for (const route of PRERENDERED_ROUTES) {
      expect(PRERENDERED_ROUTE_CHUNKS[route]).toBeTruthy();
    }
    expect(Object.keys(PRERENDERED_ROUTE_CHUNKS).sort()).toEqual([...PRERENDERED_ROUTES].sort());
  });

  it('only exempts from indexing routes that are actually prerendered', () => {
    for (const route of PRERENDERED_FOR_FIRST_PAINT_ONLY) {
      expect(PRERENDERED_ROUTES).toContain(route);
    }
  });
});
