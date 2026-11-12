import type { MovieMediaType } from '@/shared/types/movie';

const EVENT_PREFIX = '/e';
const RECAP_PREFIX = '/r';

export const NIGHT_QUERY_PARAM = 'soiree';

const MOVIE_SLUG_MAX_LENGTH = 60;

const MOVIE_PAGE_PREFIX: Record<MovieMediaType, string> = { movie: '/film', tv: '/serie' };

export interface MoviePageRef {
  tmdbId: number;
  mediaType?: MovieMediaType;
  title?: string;
}

export function movieSlug(title: string): string {
  const words = title
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words.join('-').slice(0, MOVIE_SLUG_MAX_LENGTH).replace(/-$/, '');
}

export function parseMovieRef(movieRef: string | undefined): number | null {
  const id = Number(/^\d+/.exec(movieRef ?? '')?.[0]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function moviePagePath({ tmdbId, mediaType = 'movie', title }: MoviePageRef, nightSlug?: string) {
  const slug = title ? movieSlug(title) : '';
  const ref = slug ? [tmdbId, slug].join('-') : String(tmdbId);
  const path = `${MOVIE_PAGE_PREFIX[mediaType]}/${ref}`;
  return nightSlug ? `${path}?${NIGHT_QUERY_PARAM}=${encodeURIComponent(nightSlug)}` : path;
}

export const RATE_QUERY_PARAM = 'rate';

export const FAVORITES_ANCHOR = 'favoris';

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
  accountFavorites: `/settings/profil#${FAVORITES_ANCHOR}`,
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
  releaseNotes: '/nouveautes',
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
  showcaseRecommendations: (seedTmdbId: number, seedMediaType?: 'movie' | 'tv') =>
    seedMediaType === 'tv'
      ? `/films/similaires/${seedTmdbId}?type=tv`
      : `/films/similaires/${seedTmdbId}`,
  showcaseProviderPattern: '/films/streaming/:provider',
  showcaseProvider: (provider: string) => `/films/streaming/${provider}`,
  showcaseThemePattern: '/films/theme/:theme',

  showcaseTheme: (theme: string) => `/films/theme/${theme}`,

  movieCollectionPattern: '/films/collection/:collectionId',

  movieCollection: (collectionId: number | string) => `/films/collection/${collectionId}`,

  moviePagePattern: `${MOVIE_PAGE_PREFIX.movie}/:movieRef`,

  showPagePattern: `${MOVIE_PAGE_PREFIX.tv}/:movieRef`,

  moviePage: moviePagePath,

  movieSearchFor: (query: string) =>
    query.trim() ? `/films/recherche?q=${encodeURIComponent(query.trim())}` : '/films/recherche',

  eventDetailPattern: `${EVENT_PREFIX}/:slug`,

  eventDetail: (slug: string) => `${EVENT_PREFIX}/${slug}`,

  eventDetailRating: (slug: string, movieId?: string) => {
    const rateQuery = movieId ? `${RATE_QUERY_PARAM}=${movieId}` : RATE_QUERY_PARAM;
    return `${EVENT_PREFIX}/${slug}?${rateQuery}`;
  },

  nightRecapPattern: `${RECAP_PREFIX}/:slug`,

  nightRecap: (slug: string) => `${RECAP_PREFIX}/${slug}`,

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
