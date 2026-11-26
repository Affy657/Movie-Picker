import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import {
  invalidateWatched,
  invalidateWatchedFilms,
} from '@/features/movies/hooks/invalidateWatched';
import { watchlistItemKey } from '@/features/movies/utils/watchlistItemKey';
import {
  UNSEEN_STATUS,
  fetchAllMyWatchedMovies,
  fetchWatchedStatus,
  markWatched,
  setWatchedRating,
  unmarkWatched,
  type MarkWatchedBody,
  type WatchedStatus,
  type WatchedTitleRef,
} from '@/features/library/api/watchedApi';

export function useWatchedMovies(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.watched.movies,
    queryFn: ({ signal }) => fetchAllMyWatchedMovies(signal),
    enabled: options?.enabled ?? true,
  });
}

const NO_KEYS: ReadonlySet<string> = new Set();

export function useWatchedKeys(enabled: boolean) {
  const watched = useWatchedMovies({ enabled });
  const items = watched.data?.items;
  const keys = useMemo(
    () =>
      items ? new Set(items.map((item) => watchlistItemKey(item.tmdbId, item.mediaType))) : NO_KEYS,
    [items]
  );
  return useMemo(() => {
    const has = (ref: WatchedTitleRef) => keys.has(watchlistItemKey(ref.tmdbId, ref.mediaType));
    return {
      ready: enabled && watched.isSuccess,
      has,
      countAmong: (refs: readonly WatchedTitleRef[]) => refs.filter(has).length,
    };
  }, [enabled, keys, watched.isSuccess]);
}

export function useMarkWatched() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MarkWatchedBody) => markWatched(body),
    onSuccess: () => invalidateWatched(queryClient),
  });
}

export function useUnmarkWatched() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: WatchedTitleRef) => unmarkWatched(ref),
    onSuccess: () => invalidateWatched(queryClient),
  });
}

type WatchedChange = { kind: 'mark' } | { kind: 'unmark' } | { kind: 'rate'; value: number | null };

const CHANGE_ERROR: Record<WatchedChange['kind'], TranslationKey> = {
  mark: 'watched.errors.mark',
  unmark: 'watched.errors.unmark',
  rate: 'watched.errors.rate',
};

function applyChange(item: MarkWatchedBody, change: WatchedChange): Promise<WatchedStatus> {
  if (change.kind === 'mark') return markWatched(item);
  if (change.kind === 'rate') return setWatchedRating(item, change.value);
  return unmarkWatched(item).then(() => UNSEEN_STATUS);
}

function expectedStatus(previous: WatchedStatus | undefined, change: WatchedChange): WatchedStatus {
  if (change.kind === 'unmark') return UNSEEN_STATUS;
  if (change.kind === 'rate') return { ...(previous ?? UNSEEN_STATUS), rating: change.value };
  return { ...UNSEEN_STATUS, status: 'elsewhere', watchedAt: new Date().toISOString() };
}

export function useWatchedTitle(item: MarkWatchedBody, enabled: boolean) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.watched.status(item.tmdbId, item.mediaType);
  const [error, setError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchWatchedStatus(item, signal),
    enabled,
  });

  const mutationKey = [...queryKey, 'change'];
  const { mutate } = useMutation({
    mutationKey,
    scope: { id: queryKey.join('|') },
    mutationFn: (change: WatchedChange) => applyChange(item, change),
    onMutate: async (change: WatchedChange) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WatchedStatus>(queryKey);
      queryClient.setQueryData<WatchedStatus>(queryKey, expectedStatus(previous, change));
      return { previous };
    },
    onError: (err, change, context) => {
      queryClient.setQueryData<WatchedStatus>(queryKey, context?.previous ?? UNSEEN_STATUS);
      setError(getErrorMessage(err, t(CHANGE_ERROR[change.kind])));
    },
    onSettled: (saved, err, change) => {
      if (err || !saved || change.kind === 'unmark') return invalidateWatched(queryClient);
      if (queryClient.isMutating({ mutationKey }) === 1) {
        queryClient.setQueryData<WatchedStatus>(queryKey, saved);
      }
      return change.kind === 'rate'
        ? invalidateWatchedFilms(queryClient, [queryKey])
        : invalidateWatched(queryClient, [queryKey]);
    },
  });

  const status = statusQuery.data;
  const change = (next: WatchedChange) => {
    setError(null);
    mutate(next);
  };

  return {
    status,
    isPending: enabled && statusQuery.isPending,
    error,
    toggle: () => change({ kind: status?.status === 'elsewhere' ? 'unmark' : 'mark' }),
    rate: (value: number | null) => change({ kind: 'rate', value }),
  };
}
