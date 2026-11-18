import { createElement, lazy, useEffect, useState, type ComponentType } from 'react';
import { matchRoutes } from 'react-router';
import PageFallback from '@/app/components/PageFallback';
import { MOVIE_PAGE_CHUNK } from '@/app/moviePageChunk';
import { ROUTES } from '@/app/routes';
import { hasSessionHint } from '@/features/auth/session-hint';

export const ROUTE_CHUNKS = {
  home: () => import('@/app/pages/HomePage'),
  showcaseList: () => import('@/app/pages/ShowcaseListPage'),
  movieCollections: () => import('@/app/pages/MovieCollectionsPage'),
  moviePage: () => MOVIE_PAGE_CHUNK.load(),
  landing: () => import('@/app/pages/LandingPage'),
  createEvent: () => import('@/features/events/pages/CreateEvent'),
  eventDetail: () => import('@/features/events/pages/EventDetail'),
  nightRecap: () => import('@/features/events/pages/NightRecapPage'),
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
  releaseNotes: () => import('@/app/pages/ReleaseNotesPage'),
  myEvents: () => import('@/features/events/pages/MyEventsPage'),
  watchlist: () => import('@/features/library/pages/WatchlistPage'),
  lists: () => import('@/features/library/pages/MyListsPage'),
  movieList: () => import('@/features/library/pages/MovieListPage'),
  savedList: () => import('@/features/library/pages/SavedListPage'),
  joinList: () => import('@/features/library/pages/JoinListPage'),
  memberLists: () => import('@/features/profile/pages/MemberListsPage'),
  publicList: () => import('@/features/library/pages/PublicListPage'),
  watchedMovies: () => import('@/features/library/pages/WatchedMoviesPage'),
  notifications: () => import('@/features/notifications/pages/NotificationsPage'),
  profile: () => import('@/features/profile/pages/ProfilePage'),
  profileMovies: () => import('@/features/profile/pages/ProfileMoviesPage'),
  profileProposals: () => import('@/features/profile/pages/ProfileProposalsPage'),
  profileWatchlist: () => import('@/features/profile/pages/ProfileWatchlistPage'),
  notFound: () => import('@/app/pages/NotFoundPage'),
};

type RouteChunkName = keyof typeof ROUTE_CHUNKS;

const CHUNK_BY_PATH: ReadonlyMap<string, RouteChunkName> = new Map([
  [ROUTES.home, 'home'],
  [ROUTES.myEvents, 'myEvents'],
  [ROUTES.createEvent, 'createEvent'],
  [ROUTES.watchlist, 'watchlist'],
  [ROUTES.lists, 'lists'],
  [ROUTES.watchedMovies, 'watchedMovies'],
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

type RouteChunkPage<N extends RouteChunkName> = Awaited<
  ReturnType<(typeof ROUTE_CHUNKS)[N]>
>['default'];
type LoadedPage = ComponentType<Record<string, unknown>>;

const loadedPages = new Map<RouteChunkName, LoadedPage>();
const startupPages = new Map<RouteChunkName, Promise<LoadedPage | undefined>>();

function loadRouteChunk(name: RouteChunkName): Promise<{ default: LoadedPage }> {
  return ROUTE_CHUNKS[name]().then((module) => {
    const page = module.default as unknown as LoadedPage;
    loadedPages.set(name, page);
    return { default: page };
  });
}

export function routeLazy<N extends RouteChunkName>(name: N): RouteChunkPage<N> {
  const Lazy = lazy(() => loadRouteChunk(name));
  function RouteChunk(props: Record<string, unknown>) {
    const [Page, setPage] = useState<LoadedPage | undefined>(
      () => loadedPages.get(name) ?? (startupPages.has(name) ? undefined : Lazy)
    );
    useEffect(() => {
      if (Page) return;
      let mounted = true;
      void startupPages.get(name)?.then((loaded) => {
        if (mounted) setPage(() => loaded ?? Lazy);
      });
      return () => {
        mounted = false;
      };
    }, [Page]);
    if (!Page) return createElement(PageFallback);
    return createElement(Page, props);
  }
  return RouteChunk as unknown as RouteChunkPage<N>;
}

type RouteChunkEntry = { path: string; chunk: RouteChunkName; signedIn?: boolean };

const ROUTE_CHUNK_BY_PATTERN: ReadonlyArray<RouteChunkEntry> = [
  { path: ROUTES.home, chunk: 'home' },
  { path: ROUTES.howItWorks, chunk: 'landing' },
  { path: ROUTES.movieSearch, chunk: 'showcaseList' },
  { path: ROUTES.movieCollections, chunk: 'movieCollections' },
  { path: ROUTES.showcaseTrending, chunk: 'showcaseList' },
  { path: ROUTES.showcaseNowPlaying, chunk: 'showcaseList' },
  { path: ROUTES.showcaseMostProposed, chunk: 'showcaseList' },
  { path: ROUTES.showcaseProviderPattern, chunk: 'showcaseList' },
  { path: ROUTES.showcaseRecommendationsPattern, chunk: 'showcaseList' },
  { path: ROUTES.showcaseThemePattern, chunk: 'showcaseList' },
  { path: ROUTES.movieCollectionPattern, chunk: 'showcaseList' },
  { path: ROUTES.moviePagePattern, chunk: 'moviePage' },
  { path: ROUTES.showPagePattern, chunk: 'moviePage' },
  { path: ROUTES.createEvent, chunk: 'createEvent', signedIn: true },
  { path: ROUTES.login, chunk: 'login' },
  { path: ROUTES.register, chunk: 'register' },
  { path: ROUTES.forgotPassword, chunk: 'forgotPassword' },
  { path: ROUTES.resetPassword, chunk: 'resetPassword' },
  { path: ROUTES.oauthCallback, chunk: 'oauthCallback' },
  { path: ROUTES.legalNotice, chunk: 'legalNotice' },
  { path: ROUTES.privacyPolicy, chunk: 'privacyPolicy' },
  { path: ROUTES.donate, chunk: 'donate' },
  { path: ROUTES.tech, chunk: 'tech' },
  { path: ROUTES.releaseNotes, chunk: 'releaseNotes' },
  { path: `${ROUTES.account}/*`, chunk: 'account' },
  { path: ROUTES.myEvents, chunk: 'myEvents', signedIn: true },
  { path: ROUTES.watchlist, chunk: 'watchlist', signedIn: true },
  { path: ROUTES.lists, chunk: 'lists', signedIn: true },
  { path: ROUTES.watchedMovies, chunk: 'watchedMovies', signedIn: true },
  { path: ROUTES.listPattern, chunk: 'movieList', signedIn: true },
  { path: ROUTES.savedListPattern, chunk: 'savedList', signedIn: true },
  { path: ROUTES.joinListPattern, chunk: 'joinList' },
  { path: ROUTES.notifications, chunk: 'notifications', signedIn: true },
  { path: ROUTES.eventDetailPattern, chunk: 'eventDetail' },
  { path: ROUTES.nightRecapPattern, chunk: 'nightRecap' },
  { path: ROUTES.profileMoviesPattern, chunk: 'profileMovies' },
  { path: ROUTES.profileProposalsPattern, chunk: 'profileProposals' },
  { path: ROUTES.profileWinningProposalsPattern, chunk: 'profileProposals' },
  { path: ROUTES.profileWatchlistPattern, chunk: 'profileWatchlist' },
  { path: ROUTES.profileListsPattern, chunk: 'memberLists' },
  { path: ROUTES.publicListPattern, chunk: 'publicList' },
  { path: ROUTES.profilePattern, chunk: 'profile' },
  { path: '*', chunk: 'notFound' },
];

function routeEntryForPath(pathname: string): RouteChunkEntry | undefined {
  return matchRoutes([...ROUTE_CHUNK_BY_PATTERN], pathname)?.[0]?.route;
}

export function routeChunkForPath(pathname: string): RouteChunkName | undefined {
  return routeEntryForPath(pathname)?.chunk;
}

export function preloadStartupRoute(pathname: string): Promise<void> {
  const entry = routeEntryForPath(pathname);
  if (!entry || entry.chunk === 'home') return Promise.resolve();
  if (entry.signedIn && !hasSessionHint()) return Promise.resolve();
  if (loadedPages.has(entry.chunk)) return Promise.resolve();
  let startupPage = startupPages.get(entry.chunk);
  if (!startupPage) {
    startupPage = loadRouteChunk(entry.chunk).then(
      ({ default: page }) => page,
      () => undefined
    );
    startupPages.set(entry.chunk, startupPage);
  }
  return startupPage.then(() => undefined);
}

export function resetLoadedRouteModulesForTests(): void {
  loadedPages.clear();
  startupPages.clear();
}
