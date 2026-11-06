import { hashKey, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/apiError';
import { queryRetryDelay, shouldRetryQuery } from '@/shared/api/retryPolicy';
import { queryKeys } from '@/shared/hooks/queryKeys';

const SESSION_CHECK_HASH = hashKey(queryKeys.auth.me);

function recheckSessionOn401(client: QueryClient, error: unknown): void {
  if (!ApiError.is(error) || error.code !== 401) return;
  if (!client.getQueryData(queryKeys.auth.me)) return;
  void client.invalidateQueries({ queryKey: queryKeys.auth.me }, { cancelRefetch: false });
}

export function createAppQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.queryHash !== SESSION_CHECK_HASH) recheckSessionOn401(client, error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => recheckSessionOn401(client, error),
    }),
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        retryDelay: queryRetryDelay,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
      },
    },
  });
  return client;
}
