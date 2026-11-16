import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@/app/routes';
import {
  ROUTE_CHUNKS,
  preloadRouteChunk,
  preloadStartupRoute,
  routeChunkForPath,
  routeIntentHandlers,
  resetLoadedRouteModulesForTests,
  resetPreloadedRoutesForTests,
} from '@/app/routeChunks';

describe('preloadRouteChunk', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the chunk of the targeted page only once', () => {
    resetPreloadedRoutesForTests();
    const load = vi.spyOn(ROUTE_CHUNKS, 'myEvents').mockResolvedValue({} as never);

    preloadRouteChunk(ROUTES.myEvents);
    preloadRouteChunk(ROUTES.myEvents);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('ignores a path that matches no page', () => {
    resetPreloadedRoutesForTests();
    const loads = (Object.keys(ROUTE_CHUNKS) as Array<keyof typeof ROUTE_CHUNKS>).map((name) =>
      vi.spyOn(ROUTE_CHUNKS, name).mockResolvedValue({} as never)
    );

    preloadRouteChunk('/nulle-part');

    for (const load of loads) expect(load).not.toHaveBeenCalled();
  });

  it('exposes handlers that prefetch on navigation intent', () => {
    resetPreloadedRoutesForTests();
    const load = vi.spyOn(ROUTE_CHUNKS, 'watchlist').mockResolvedValue({} as never);

    const handlers = routeIntentHandlers(ROUTES.watchlist);
    handlers.onMouseEnter();
    handlers.onFocus();
    handlers.onTouchStart();

    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe('routeChunkForPath', () => {
  it('finds the chunk of every page the router serves', () => {
    const expected: Record<string, keyof typeof ROUTE_CHUNKS> = {
      '/': 'home',
      '/decouvrir': 'landing',
      '/films/recherche': 'showcaseList',
      '/films/collections': 'movieCollections',
      '/films/collection/10': 'showcaseList',
      '/films/theme/horreur': 'showcaseList',
      '/film/603-matrix': 'moviePage',
      '/serie/1399-game-of-thrones': 'moviePage',
      '/new': 'createEvent',
      '/login': 'login',
      '/register': 'register',
      '/forgot-password': 'forgotPassword',
      '/reset': 'resetPassword',
      '/auth/callback': 'oauthCallback',
      '/mentions-legales': 'legalNotice',
      '/politique-de-confidentialite': 'privacyPolicy',
      '/soutenir': 'donate',
      '/tech': 'tech',
      '/nouveautes': 'releaseNotes',
      '/settings/profil': 'account',
      '/my-events': 'myEvents',
      '/watchlist': 'watchlist',
      '/listes': 'lists',
      '/listes/films-vus': 'watchedMovies',
      '/listes/abc': 'movieList',
      '/listes/enregistrees/abc': 'savedList',
      '/l/token/rejoindre': 'joinList',
      '/notifications': 'notifications',
      [ROUTES.eventDetail('soiree')]: 'eventDetail',
      [ROUTES.nightRecapPattern.replace(':slug', 'soiree')]: 'nightRecap',
      '/u/alice': 'profile',
      '/u/alice/films': 'profileMovies',
      '/u/alice/propositions': 'profileProposals',
      '/u/alice/propositions-gagnantes': 'profileProposals',
      '/u/alice/watchlist': 'profileWatchlist',
      '/u/alice/listes': 'memberLists',
      '/u/alice/listes/abc': 'publicList',
      '/nulle-part': 'notFound',
    };

    for (const [path, chunk] of Object.entries(expected)) {
      expect(routeChunkForPath(path), path).toBe(chunk);
    }
    expect(new Set(Object.values(expected))).toEqual(new Set(Object.keys(ROUTE_CHUNKS)));
  });
});

describe('preloadStartupRoute', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetLoadedRouteModulesForTests();
  });

  it('loads the page the application opens on before the first render', async () => {
    const load = vi
      .spyOn(ROUTE_CHUNKS, 'profile')
      .mockResolvedValue({ default: () => null } as never);

    await preloadStartupRoute('/u/alice');

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('leaves the home alone, its first paint comes from the document', async () => {
    const load = vi.spyOn(ROUTE_CHUNKS, 'home').mockResolvedValue({ default: () => null } as never);

    await preloadStartupRoute('/');

    expect(load).not.toHaveBeenCalled();
  });

  it('never blocks the start when the chunk does not load', async () => {
    vi.spyOn(ROUTE_CHUNKS, 'login').mockRejectedValue(new Error('offline'));

    await expect(preloadStartupRoute('/login')).resolves.toBeUndefined();
  });
});
