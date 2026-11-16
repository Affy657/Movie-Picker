import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  cancelListInvitation,
  createInviteLink,
  disableInviteLink,
  fetchInvitableUsers,
  fetchInvitePreview,
  fetchListMembers,
  inviteToList,
  joinListByLink,
  leaveList,
  removeListMember,
} from '@/features/lists/api/listMembersApi';
import { invalidateAllExcept } from '@/shared/api/invalidateAllExcept';
import { queryKeys } from '@/shared/hooks/queryKeys';

function invalidateMembers(queryClient: QueryClient, listId: string): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.lists.members(listId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.lists.invitable(listId) }),
  ]).then(() => undefined);
}

export function useListMembers(listId: string) {
  return useQuery({
    queryKey: queryKeys.lists.members(listId),
    queryFn: ({ signal }) => fetchListMembers(listId, signal),
  });
}

export function useInvitableUsers(listId: string) {
  return useQuery({
    queryKey: queryKeys.lists.invitable(listId),
    queryFn: ({ signal }) => fetchInvitableUsers(listId, signal),
    staleTime: 30_000,
  });
}

export function useListMemberActions(listId: string) {
  const queryClient = useQueryClient();
  const refresh = () => invalidateMembers(queryClient, listId);
  const invite = useMutation({
    mutationFn: (userId: string) => inviteToList(listId, userId),
    onSettled: refresh,
  });
  const cancelInvitation = useMutation({
    mutationFn: (userId: string) => cancelListInvitation(listId, userId),
    onSettled: refresh,
  });
  const removeMember = useMutation({
    mutationFn: (userId: string) => removeListMember(listId, userId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.lists.all }),
  });
  const createLink = useMutation({
    mutationFn: () => createInviteLink(listId),
    onSettled: refresh,
  });
  const disableLink = useMutation({
    mutationFn: () => disableInviteLink(listId),
    onSettled: refresh,
  });
  return { invite, cancelInvitation, removeMember, createLink, disableLink };
}

export function useLeaveList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => leaveList(listId),
    onSuccess: (_result, listId) =>
      invalidateAllExcept(queryClient, queryKeys.lists.all, [
        queryKeys.lists.detail(listId),
        queryKeys.lists.members(listId),
      ]),
  });
}

export function useInvitePreview(token: string, viewerId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.lists.invitePreview(token, viewerId),
    queryFn: ({ signal }) => fetchInvitePreview(token, signal),
    enabled,
  });
}

export function useJoinListByLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => joinListByLink(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.lists.all }),
  });
}
