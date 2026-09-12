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
  tech: '/tech',
  notifications: '/notifications',
  howItWorks: '/decouvrir',

  movieSearch: '/films/recherche',
  movieCollections: '/films/collections',
  showcaseTrending: '/films/tendances',

  showcaseTrendingForGenre: (genreId?: number) =>
    genreId ? `/films/tendances?genre=${genreId}` : '/films/tendances',

  showcaseNowPlaying: '/films/au-cinema',
  showcaseMostProposed: '/films/les-plus-proposes',

  showcaseRecommendationsPattern: '/films/similaires/:seedTmdbId',
  showcaseRecommendations: (seedTmdbId: number) => `/films/similaires/${seedTmdbId}`,
  showcaseProviderPattern: '/films/streaming/:provider',
  showcaseProvider: (provider: string) => `/films/streaming/${provider}`,
  showcaseThemePattern: '/films/theme/:theme',

  showcaseTheme: (theme: string) => `/films/theme/${theme}`,

  movieCollectionPattern: '/films/collection/:collectionId',

  movieCollection: (collectionId: number | string) => `/films/collection/${collectionId}`,

  movieSearchFor: (query: string) =>
    query.trim() ? `/films/recherche?q=${encodeURIComponent(query.trim())}` : '/films/recherche',

  eventDetailPattern: `${EVENT_PREFIX}/:slug`,

  eventDetail: (slug: string) => `${EVENT_PREFIX}/${slug}`,

  profilePattern: '/u/:handle',

  profile: (handle: string) => `/u/${handle}`,

  profileMoviesPattern: '/u/:handle/films',

  profileMovies: (handle: string) => `/u/${handle}/films`,

  profileWatchlistPattern: '/u/:handle/watchlist',

  profileWatchlist: (handle: string) => `/u/${handle}/watchlist`,
} as const;

export function withReturnTo(path: string, returnTo: string): string {
  if (!returnTo || returnTo === ROUTES.home) return path;
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
