/** Préfixe de la route événement (utilisé aussi comme pattern React Router). */
const EVENT_PREFIX = '/s';

export const ROUTES = {
  home: '/',
  createEvent: '/new',
  login: '/connexion',
  register: '/inscription',
  account: '/compte',
  myEvents: '/mes-soirees',
  /** Pattern React Router pour le matching (`/s/:slug`). */
  eventDetailPattern: `${EVENT_PREFIX}/:slug`,
  /** URL concrète pour un slug donné. */
  eventDetail: (slug: string) => `${EVENT_PREFIX}/${slug}`,
} as const;

/** Ajoute `?returnTo=…` à un chemin. */
export function withReturnTo(path: string, returnTo: string): string {
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
