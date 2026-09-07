import { useQuery } from '@tanstack/react-query';
import {
  fetchMovieCollections,
  fetchMovieShowcase,
  showcaseQueryKey,
  type ShowcaseQuery,
} from '@/features/movies/api/showcaseApi';

const SHOWCASE_STALE_TIME = 1000 * 60 * 30;

export function useMovieShowcase(query: ShowcaseQuery, enabled = true) {
  return useQuery({
    queryKey: showcaseQueryKey(query),
    queryFn: ({ signal }) => fetchMovieShowcase(query, signal),
    staleTime: SHOWCASE_STALE_TIME,
    enabled,
  });
}

export function useMovieCollections(enabled = true) {
  return useQuery({
    queryKey: ['movies', 'collections'] as const,
    queryFn: ({ signal }) => fetchMovieCollections(signal),
    staleTime: SHOWCASE_STALE_TIME,
    enabled,
  });
}
