import { ROUTES } from '@/app/routes';

export const ROUTE_CHUNKS = {
  home: () => import('@/app/pages/HomePage'),
  showcaseList: () => import('@/app/pages/ShowcaseListPage'),
  movieCollections: () => import('@/app/pages/MovieCollectionsPage'),
  landing: () => import('@/app/pages/LandingPage'),
  createEvent: () => import('@/features/events/pages/CreateEvent'),
  eventDetail: () => import('@/features/events/pages/EventDetail'),
  login: () => import('@/features/auth/pages/LoginPage'),
  register: () => import('@/features/auth/pages/RegisterPage'),
  forgotPassword: () => import('@/features/auth/pages/ForgotPasswordPage'),
  resetPassword: () => import('@/features/auth/pages/ResetPasswordPage'),
  oauthCallback: () => import('@/features/auth/pages/OAuthCallbackPage'),
  account: () => import('@/app/pages/account/AccountPage'),
  legalNotice: () => import('@/app/pages/LegalNoticePage'),
  privacyPolicy: () => import('@/app/pages/PrivacyPolicyPage'),
  donate: () => import('@/app/pages/DonatePage'),
  tech: () => import('@/app/pages/TechPage'),
  myEvents: () => import('@/features/events/pages/MyEventsPage'),
  watchlist: () => import('@/features/watchlist/pages/WatchlistPage'),
  notifications: () => import('@/features/notifications/pages/NotificationsPage'),
  profile: () => import('@/features/profile/pages/ProfilePage'),
  profileMovies: () => import('@/features/profile/pages/ProfileMoviesPage'),
  profileWatchlist: () => import('@/features/profile/pages/ProfileWatchlistPage'),
  notFound: () => import('@/app/pages/NotFoundPage'),
};

type RouteChunkName = keyof typeof ROUTE_CHUNKS;

const CHUNK_BY_PATH: ReadonlyMap<string, RouteChunkName> = new Map([
  [ROUTES.home, 'home'],
  [ROUTES.myEvents, 'myEvents'],
  [ROUTES.createEvent, 'createEvent'],
  [ROUTES.watchlist, 'watchlist'],
  [ROUTES.notifications, 'notifications'],
  [ROUTES.account, 'account'],
  [ROUTES.login, 'login'],
  [ROUTES.register, 'register'],
  [ROUTES.howItWorks, 'landing'],
]);

const preloaded = new Set<RouteChunkName>();

export function preloadRouteChunk(path: string): void {
  const name = CHUNK_BY_PATH.get(path);
  if (!name || preloaded.has(name)) return;
  preloaded.add(name);
  ROUTE_CHUNKS[name]().catch(() => preloaded.delete(name));
}

export function routeIntentHandlers(path: string): {
  onMouseEnter: () => void;
  onFocus: () => void;
  onTouchStart: () => void;
} {
  const preload = (): void => preloadRouteChunk(path);
  return { onMouseEnter: preload, onFocus: preload, onTouchStart: preload };
}

export function resetPreloadedRoutesForTests(): void {
  preloaded.clear();
}
