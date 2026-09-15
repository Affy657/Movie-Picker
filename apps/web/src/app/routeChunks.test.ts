import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@/app/routes';
import {
  ROUTE_CHUNKS,
  preloadRouteChunk,
  routeIntentHandlers,
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
