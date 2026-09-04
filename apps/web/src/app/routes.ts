const EVENT_PREFIX = '/e';

export const ROUTES = {
  home: '/',
  createEvent: '/new',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset',
  oauthCallback: '/auth/callback',
  account: '/settings',
  accountProfile: '/settings/profil',
  accountPreferences: '/settings/preferences',
  accountNotifications: '/settings/notifications',
  accountIntegrations: '/settings/integrations',
  accountSecurity: '/settings/securite',
  myEvents: '/my-events',
  watchlist: '/watchlist',
  legalNotice: '/mentions-legales',
  privacyPolicy: '/politique-de-confidentialite',
  donate: '/soutenir',
  notifications: '/notifications',
  discover: '/decouvrir',

  eventDetailPattern: `${EVENT_PREFIX}/:slug`,

  eventDetail: (slug: string) => `${EVENT_PREFIX}/${slug}`,

  profilePattern: '/u/:handle',

  profile: (handle: string) => `/u/${handle}`,

  profileMoviesPattern: '/u/:handle/films',

  profileMovies: (handle: string) => `/u/${handle}/films`,
} as const;

export function withReturnTo(path: string, returnTo: string): string {
  if (!returnTo || returnTo === ROUTES.home) return path;
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
