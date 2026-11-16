import { hashKey, type QueryClient, type QueryKey } from '@tanstack/react-query';

export function invalidateAllExcept(
  queryClient: QueryClient,
  queryKey: QueryKey,
  excludedKeys: readonly QueryKey[]
): Promise<void> {
  if (excludedKeys.length === 0) return queryClient.invalidateQueries({ queryKey });
  const excludedHashes = new Set(excludedKeys.map((key) => hashKey(key)));
  return queryClient.invalidateQueries({
    queryKey,
    predicate: (query) => !excludedHashes.has(query.queryHash),
  });
}
