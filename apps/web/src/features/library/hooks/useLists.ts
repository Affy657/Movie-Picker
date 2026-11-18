import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  addListItem,
  createList,
  deleteList,
  fetchList,
  fetchMyLists,
  removeListItem,
  updateList,
  type CreateListBody,
  type MovieListItemBody,
  type MovieListSummary,
  type UpdateListBody,
} from '@/features/library/api/listsApi';
import { sortListSummaries } from '@/features/library/utils/listSummaries';
import { getErrorMessage } from '@/shared/api/apiError';
import { invalidateAllExcept } from '@/shared/api/invalidateAllExcept';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import type { MovieMediaType } from '@/shared/types/movie';

function invalidateLists(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
}

function invalidateListsAndProfileFigures(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    invalidateLists(queryClient),
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.statsAll }),
  ]).then(() => undefined);
}

export function refreshMyLists(queryClient: QueryClient): Promise<void> {
  return Promise.all(
    [queryKeys.lists.mine, queryKeys.lists.containingAll].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey })
    )
  ).then(() => undefined);
}

export function useMyLists(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.lists.mine,
    queryFn: ({ signal }) => fetchMyLists(undefined, signal),
    enabled: options?.enabled ?? true,
  });
}

export function useList(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.lists.detail(id),
    queryFn: ({ signal }) => fetchList(id ?? '', signal),
    enabled: !!id && (options?.enabled ?? true),
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateListBody) => createList(body),
    onSuccess: () => invalidateListsAndProfileFigures(queryClient),
  });
}

export function useUpdateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateListBody }) => updateList(id, body),
    onSuccess: () => invalidateListsAndProfileFigures(queryClient),
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteList(id),
    onSuccess: (_result, id) =>
      Promise.all([
        invalidateAllExcept(queryClient, queryKeys.lists.all, [queryKeys.lists.detail(id)]),
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.statsAll }),
      ]).then(() => undefined),
  });
}

export function useAddListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, item }: { listId: string; item: MovieListItemBody }) =>
      addListItem(listId, item),
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useRemoveListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      listId,
      tmdbId,
      mediaType,
    }: {
      listId: string;
      tmdbId: number;
      mediaType: MovieMediaType;
    }) => removeListItem(listId, tmdbId, mediaType),
    onSuccess: () => invalidateLists(queryClient),
  });
}

const NO_LISTS: MovieListSummary[] = [];

interface MembershipChange {
  listId: string;
  add: boolean;
}

function withMembership(lists: MovieListSummary[] | undefined, change: MembershipChange) {
  return lists?.map((list) =>
    list.id === change.listId
      ? {
          ...list,
          containsMovie: change.add,
          itemCount: Math.max(0, list.itemCount + (change.add ? 1 : -1)),
        }
      : list
  );
}

export function useListMembershipToggle(item: MovieListItemBody, enabled: boolean) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const mediaType = item.mediaType ?? 'movie';
  const queryKey = queryKeys.lists.containing(item.tmdbId, mediaType);
  const [error, setError] = useState<string | null>(null);
  const memberships = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchMyLists({ tmdbId: item.tmdbId, mediaType }, signal),
    enabled,
  });
  const lists = useMemo(
    () => sortListSummaries(memberships.data ?? NO_LISTS, 'name', 'asc'),
    [memberships.data]
  );

  const mutationKey = [...queryKey, 'membership'];
  const { mutate } = useMutation({
    mutationKey,
    mutationFn: ({ listId, add }: MembershipChange) =>
      add ? addListItem(listId, item) : removeListItem(listId, item.tmdbId, mediaType),
    onMutate: async (change: MembershipChange) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<MovieListSummary[]>(queryKey, (current) =>
        withMembership(current, change)
      );
    },
    onError: (err, change) => {
      queryClient.setQueryData<MovieListSummary[]>(queryKey, (current) =>
        withMembership(current, { listId: change.listId, add: !change.add })
      );
      setError(
        getErrorMessage(err, t(change.add ? 'lists.page.addError' : 'lists.page.removeError'))
      );
    },
    onSettled: async () => {
      if (queryClient.isMutating({ mutationKey }) === 1) await invalidateLists(queryClient);
    },
  });

  const toggle = (listId: string) => {
    const list = lists.find((candidate) => candidate.id === listId);
    if (!list) return;
    setError(null);
    mutate({ listId, add: !list.containsMovie });
  };

  return {
    lists,
    isLoading: memberships.isPending && enabled,
    isError: memberships.isError,
    count: lists.filter((list) => list.containsMovie).length,
    error,
    toggle,
    retry: () => void memberships.refetch(),
  };
}
