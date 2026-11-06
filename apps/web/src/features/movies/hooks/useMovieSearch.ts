import { useCallback, useEffect, useRef, useState } from 'react';
import { skipToken, useQuery } from '@tanstack/react-query';
import {
  searchMovies,
  type MovieSearchFilters,
  type MovieSearchItem,
  type MovieSearchListResponse,
} from '@/features/movies/api/moviesApi';
import { queryKeys } from '@/shared/hooks/queryKeys';

const SEARCH_DEBOUNCE_MS = 350;
export const SEARCH_MIN_CHARS = 2;

const NO_RESULTS: MovieSearchItem[] = [];

export type MovieSearchMeta = Pick<
  MovieSearchListResponse,
  'disclaimer' | 'watchProvidersRegion' | 'tmdbAttributionUrl'
>;

type MovieSearchScope = {
  lang: string;
  eventSlug?: string;
  includeSeries: boolean;
};

type MovieSearchRequest = MovieSearchScope & {
  key: string;
  term: string;
  filters: MovieSearchFilters;
};

type UseMovieSearchOptions = MovieSearchScope & {
  term: string;
  filters: MovieSearchFilters;
  hasApiFilters: boolean;
  takeImmediate: () => boolean;
  onSearched: (term: string) => void;
};

function movieSearchKey(term: string, filters: MovieSearchFilters): string {
  return `${term}|${(filters.genreIds ?? []).join(',')}|${filters.yearFrom ?? ''}|${filters.yearTo ?? ''}|${filters.voteMin ?? ''}|${filters.originalLanguage ?? ''}|${filters.runtimeMin ?? ''}|${filters.runtimeMax ?? ''}`;
}

function requestQueryKey(request: MovieSearchRequest) {
  return queryKeys.movies.search(
    request.key,
    request.lang,
    request.eventSlug,
    request.includeSeries
  );
}

function isSameQuery(a: MovieSearchRequest | null, b: MovieSearchRequest): boolean {
  return (
    a !== null &&
    a.key === b.key &&
    a.lang === b.lang &&
    a.eventSlug === b.eventSlug &&
    a.includeSeries === b.includeSeries
  );
}

function metaOf(body: MovieSearchListResponse | undefined): MovieSearchMeta | null {
  if (!body?.disclaimer && !body?.watchProvidersRegion && !body?.tmdbAttributionUrl) return null;
  return {
    disclaimer: body.disclaimer,
    watchProvidersRegion: body.watchProvidersRegion,
    tmdbAttributionUrl: body.tmdbAttributionUrl,
  };
}

export function useMovieSearch({
  term,
  filters,
  hasApiFilters,
  lang,
  eventSlug,
  includeSeries,
  takeImmediate,
  onSearched,
}: UseMovieSearchOptions) {
  const [request, setRequest] = useState<MovieSearchRequest | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ takeImmediate, onSearched });
  latest.current = { takeImmediate, onSearched };

  const searchKey = movieSearchKey(term, filters);

  const query = useQuery({
    queryKey: request ? requestQueryKey(request) : queryKeys.movies.searchIdle,
    queryFn: request
      ? async ({ signal }) => {
          const body = await searchMovies(request.term, {
            signal,
            lang: request.lang,
            eventSlug: request.eventSlug,
            includeSeries: request.includeSeries,
            filters: request.filters,
          });
          if (!signal.aborted && request.term.length >= SEARCH_MIN_CHARS) {
            latest.current.onSearched(request.term);
          }
          return body;
        }
      : skipToken,
    placeholderData: (previous, previousQuery) =>
      request && previousQuery?.queryKey[2] === request.key ? previous : undefined,
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    networkMode: 'always',
  });
  const refetch = query.refetch;

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current === null) return;
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }, []);

  useEffect(() => {
    const immediate = latest.current.takeImmediate();
    clearDebounceTimer();

    const filtersOnlySearch = term.length === 0 && hasApiFilters;
    if (term.length < SEARCH_MIN_CHARS && !filtersOnlySearch) {
      setRequest(null);
      return undefined;
    }

    const next = { key: searchKey, term, filters, lang, eventSlug, includeSeries };
    if (immediate) {
      setRequest(next);
      return undefined;
    }

    setRequest((current) => (current?.key === searchKey ? current : null));
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      setRequest(next);
    }, SEARCH_DEBOUNCE_MS);
    return clearDebounceTimer;
  }, [term, filters, hasApiFilters, searchKey, lang, eventSlug, includeSeries, clearDebounceTimer]);

  const searchNow = useCallback(() => {
    clearDebounceTimer();
    const next = { key: searchKey, term, filters, lang, eventSlug, includeSeries };
    if (isSameQuery(request, next)) {
      void refetch();
      return;
    }
    setRequest(next);
  }, [
    clearDebounceTimer,
    request,
    refetch,
    searchKey,
    term,
    filters,
    lang,
    eventSlug,
    includeSeries,
  ]);

  const reset = useCallback(() => {
    clearDebounceTimer();
    setRequest(null);
  }, [clearDebounceTimer]);

  const body = request ? query.data : undefined;
  const failure = query.isError && !query.isFetching ? query.error : null;
  const answered = !!body && !query.isPlaceholderData && !failure;

  return {
    searchKey,
    results: body?.items ?? NO_RESULTS,
    meta: metaOf(body),
    searching: query.isFetching,
    answered,
    failure,
    emptySearchKey: answered && body.items.length === 0 ? request?.key : undefined,
    searchNow,
    reset,
  };
}
