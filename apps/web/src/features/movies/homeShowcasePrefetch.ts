import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/routes';
import {
  SHOWCASE_STALE_TIME,
  fetchMovieCollections,
  fetchMovieShowcase,
  showcaseQueryKey,
  type ShowcaseQuery,
} from '@/features/movies/api/showcaseApi';
import { PROVIDER_KEYS, THEME_KEYS } from '@/features/movies/showcaseSections';

export const HOME_SHOWCASE_QUERIES: ReadonlyArray<ShowcaseQuery> = [
  { section: 'provider', provider: PROVIDER_KEYS[0] },
  { section: 'trending' },
  { section: 'now-playing' },
  { section: 'theme', theme: THEME_KEYS[0] },
  { section: 'most-proposed' },
];

export function prefetchHomeShowcase(queryClient: QueryClient): void {
  for (const query of HOME_SHOWCASE_QUERIES) {
    void queryClient.prefetchQuery({
      queryKey: showcaseQueryKey(query),
      queryFn: ({ signal }) => fetchMovieShowcase(query, signal),
      staleTime: SHOWCASE_STALE_TIME,
    });
  }
  void queryClient.prefetchQuery({
    queryKey: ['movies', 'collections'] as const,
    queryFn: ({ signal }) => fetchMovieCollections(signal),
    staleTime: SHOWCASE_STALE_TIME,
  });
}

export function useHomeShowcasePrefetch(): void {
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === ROUTES.home) prefetchHomeShowcase(queryClient);
  }, [pathname, queryClient]);
}
