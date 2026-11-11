import { useQuery } from '@tanstack/react-query';
import {
  SHOWCASE_STALE_TIME,
  fetchMovieCollections,
  fetchMovieShowcase,
  fetchShowcaseThemes,
  showcaseQueryKey,
  type ShowcaseQuery,
} from '@/features/movies/api/showcaseApi';

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

export function useShowcaseThemes() {
  return useQuery({
    queryKey: ['movies', 'showcase', 'themes'] as const,
    queryFn: ({ signal }) => fetchShowcaseThemes(signal),
    staleTime: SHOWCASE_STALE_TIME,
  });
}
