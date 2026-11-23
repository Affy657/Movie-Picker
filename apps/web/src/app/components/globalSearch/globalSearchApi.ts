import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useAuth } from '@/features/auth/contexts/AuthContext';

export type GlobalSearchResponse = ApiSchemas['GlobalSearchResponse'];

export const GLOBAL_SEARCH_MIN_LENGTH = 2;

const TYPING_PAUSE_MS = 250;

export function searchEverywhere(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query });
  return fetchApi<GlobalSearchResponse>(
    `/search?${params.toString()}`,
    signal ? { signal } : undefined
  );
}

export function useGlobalSearch(term: string) {
  const { user } = useAuth();
  const query = useDebouncedValue(term.trim(), TYPING_PAUSE_MS);
  const ready = query.length >= GLOBAL_SEARCH_MIN_LENGTH;
  const results = useQuery({
    queryKey: queryKeys.globalSearch.results(user?.userId ?? null, query),
    queryFn: ({ signal }) => searchEverywhere(query, signal),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
  return { query, ready, results };
}
