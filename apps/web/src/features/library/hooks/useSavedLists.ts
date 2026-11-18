import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  copySavedList,
  fetchSavedList,
  fetchSavedListBySource,
  fetchSavedLists,
  saveList,
  unsaveList,
  type SavedListSource,
  type SavedListSummary,
} from '@/features/library/api/savedListsApi';
import { refreshMyLists } from '@/features/library/hooks/useLists';
import { getErrorMessage } from '@/shared/api/apiError';
import { invalidateAllExcept } from '@/shared/api/invalidateAllExcept';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';

function invalidateSavedLists(queryClient: QueryClient, unsavedId?: string): Promise<void> {
  return invalidateAllExcept(
    queryClient,
    queryKeys.lists.savedAll,
    unsavedId ? [queryKeys.lists.savedDetail(unsavedId)] : []
  );
}

export function useSavedLists(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.lists.savedMine,
    queryFn: ({ signal }) => fetchSavedLists(signal),
    enabled: options?.enabled ?? true,
  });
}

export function useSavedList(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.lists.savedDetail(id),
    queryFn: ({ signal }) => fetchSavedList(id ?? '', signal),
    enabled: !!id && (options?.enabled ?? true),
  });
}

export function useUnsaveList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unsaveList(id),
    onSuccess: (_result, id) => invalidateSavedLists(queryClient, id),
  });
}

export function useCopySavedList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => copySavedList(id, name),
    onSuccess: () => refreshMyLists(queryClient),
  });
}

type SavedChange = { save: true } | { save: false; id: string };

function pendingSummary(source: SavedListSource): SavedListSummary {
  return {
    ...source,
    id: '',
    name: '',
    itemCount: 0,
    posterPaths: [],
    watchedCount: 0,
    createdAt: new Date().toISOString(),
    unavailable: false,
  };
}

const NO_SOURCE: SavedListSource = { sourceType: 'tmdbCollection', sourceId: '' };

export function useSavedListToggle(source: SavedListSource | null, enabled: boolean) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const target = source ?? NO_SOURCE;
  const queryKey = queryKeys.lists.savedBySource(target.sourceType, target.sourceId);
  const [error, setError] = useState<string | null>(null);
  const active = enabled && !!source;

  const savedQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchSavedListBySource(target, signal),
    enabled: active,
  });

  const mutation = useMutation({
    mutationFn: (change: SavedChange) =>
      change.save ? saveList(target) : unsaveList(change.id).then(() => null),
    onMutate: async (change: SavedChange) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SavedListSummary | null>(queryKey);
      queryClient.setQueryData(queryKey, change.save ? pendingSummary(target) : null);
      return { previous };
    },
    onSuccess: (summary) => {
      queryClient.setQueryData(queryKey, summary);
    },
    onError: (err, change, context) => {
      queryClient.setQueryData(queryKey, context?.previous ?? null);
      setError(
        getErrorMessage(err, t(change.save ? 'lists.saved.saveError' : 'lists.saved.unsaveError'))
      );
    },
    onSettled: (_summary, _err, change) =>
      invalidateSavedLists(queryClient, change.save ? undefined : change.id),
  });

  const current = savedQuery.data ?? null;
  const toggle = () => {
    if (!active || mutation.isPending) return;
    setError(null);
    mutation.mutate(current ? { save: false, id: current.id } : { save: true });
  };

  return {
    saved: current !== null,
    isLoading: active && savedQuery.isPending,
    isPending: mutation.isPending,
    error,
    toggle,
  };
}
