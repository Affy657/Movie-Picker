import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { joinEvent } from '@/features/events/api/eventsApi';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import {
  acceptGroupInvitation,
  cancelGroupInvitation,
  createGroup,
  createGroupInviteLink,
  declineGroupInvitation,
  deleteGroup,
  disableGroupInviteLink,
  fetchGroup,
  fetchGroupInvitableUsers,
  fetchGroupInvitePreview,
  fetchGroupMembers,
  inviteToGroup,
  joinGroupByLink,
  leaveGroup,
  removeGroupMember,
  renameGroup,
} from '@/features/groups/api/groupsApi';
import { invalidateAllExcept } from '@/shared/api/invalidateAllExcept';
import { invalidateMyNights } from '@/shared/api/invalidateMyNights';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { setStoredParticipant } from '@/shared/utils/eventIdentityStorage';

function forgetGroup(queryClient: QueryClient, groupId: string): Promise<void> {
  return Promise.all([
    invalidateAllExcept(queryClient, queryKeys.groups.all, [
      queryKeys.groups.detail(groupId),
      queryKeys.groups.members(groupId),
      queryKeys.groups.invitable(groupId),
    ]),
    queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list }),
  ]).then(() => undefined);
}

export function useGroup(groupId: string | undefined, { enabled = true } = {}) {
  const id = groupId ?? '';
  return useQuery({
    queryKey: queryKeys.groups.detail(id),
    queryFn: ({ signal }) => fetchGroup(id, signal),
    enabled: enabled && !!groupId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createGroup(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups.mine }),
  });
}

export function useRenameGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => renameGroup(groupId, name),
    onSuccess: () => invalidateMyNights(queryClient),
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    onSuccess: (_result, groupId) => forgetGroup(queryClient, groupId),
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => leaveGroup(groupId),
    onSuccess: (_result, groupId) => forgetGroup(queryClient, groupId),
  });
}

export function useAnswerGroupInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, accept }: { groupId: string; accept: boolean }) => {
      if (accept) await acceptGroupInvitation(groupId);
      else await declineGroupInvitation(groupId);
    },
    onSuccess: (_result, { accept }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox }),
        accept
          ? invalidateMyNights(queryClient)
          : queryClient.invalidateQueries({ queryKey: queryKeys.groups.mine }),
      ]).then(() => undefined),
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId),
    queryFn: ({ signal }) => fetchGroupMembers(groupId, signal),
  });
}

export function useGroupInvitableUsers(groupId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.groups.invitable(groupId),
    queryFn: ({ signal }) => fetchGroupInvitableUsers(groupId, signal),
    staleTime: 30_000,
    enabled,
  });
}

export function useGroupMemberActions(groupId: string) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.invitable(groupId) }),
    ]).then(() => undefined);
  const invite = useMutation({
    mutationFn: (userId: string) => inviteToGroup(groupId, userId),
    onSettled: refresh,
  });
  const cancelInvitation = useMutation({
    mutationFn: (userId: string) => cancelGroupInvitation(groupId, userId),
    onSettled: refresh,
  });
  const removeMember = useMutation({
    mutationFn: (userId: string) => removeGroupMember(groupId, userId),
    onSettled: () => invalidateMyNights(queryClient),
  });
  const createLink = useMutation({
    mutationFn: () => createGroupInviteLink(groupId),
    onSettled: refresh,
  });
  const disableLink = useMutation({
    mutationFn: () => disableGroupInviteLink(groupId),
    onSettled: refresh,
  });
  return { invite, cancelInvitation, removeMember, createLink, disableLink };
}

export function useGroupInvitePreview(token: string, viewerId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.groups.invitePreview(token, viewerId),
    queryFn: ({ signal }) => fetchGroupInvitePreview(token, signal),
    enabled,
  });
}

export function useJoinGroupByLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => joinGroupByLink(token),
    onSuccess: () =>
      Promise.all([
        invalidateMyNights(queryClient),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox }),
      ]).then(() => undefined),
  });
}

export function useJoinGroupNight() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { track } = useAnalytics();
  return useMutation({
    mutationFn: (slug: string) => joinEvent(slug, user?.displayName.trim() || 'Participant'),
    onSuccess: (joined, slug) => {
      setStoredParticipant(slug, joined.participant.id, joined.participant.pseudo);
      track('event_joined');
      return Promise.all([
        invalidateMyNights(queryClient),
        queryClient.invalidateQueries({ queryKey: queryKeys.event.detailForAnyHostToken(slug) }),
      ]).then(() => undefined);
    },
  });
}
