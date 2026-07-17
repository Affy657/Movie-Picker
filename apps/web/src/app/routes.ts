const EVENT_PREFIX = '/e';

export const ROUTES = {
  home: '/',
  createEvent: '/new',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset',
  account: '/settings',
  myEvents: '/my-events',
  watchlist: '/watchlist',

  eventDetailPattern: `${EVENT_PREFIX}/:slug`,

  eventDetail: (slug: string) => `${EVENT_PREFIX}/${slug}`,

  profilePattern: '/u/:handle',

  profile: (handle: string) => `/u/${handle}`,
} as const;

export function withReturnTo(path: string, returnTo: string): string {
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
