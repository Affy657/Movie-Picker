import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  copyPublicList,
  fetchPublicList,
  fetchPublicLists,
  type PublicListRef,
} from '@/features/library/api/publicListsApi';
import { refreshMyLists } from '@/features/library/hooks/useLists';
import { queryKeys } from '@/shared/hooks/queryKeys';

export function usePublicLists(handle: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lists.publicOf(handle),
    queryFn: ({ signal }) => fetchPublicLists(handle ?? '', signal),
    enabled: !!handle,
    retry: false,
  });
}

export function usePublicList(handle: string | undefined, listId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lists.publicDetail(handle, listId),
    queryFn: ({ signal }) => fetchPublicList(handle ?? '', listId ?? '', signal),
    enabled: !!handle && !!listId,
    retry: false,
  });
}

export function useCopyPublicList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ref, name }: { ref: PublicListRef; name: string }) => copyPublicList(ref, name),
    onSuccess: () => refreshMyLists(queryClient),
  });
}
