import { QueryClient } from '@tanstack/react-query';
import { queryRetryDelay, shouldRetryQuery } from '@/shared/api/retryPolicy';

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
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
}
