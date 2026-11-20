import { useTranslation } from '@/shared/i18n';
import MembersDialog from '@/features/library/components/MembersDialog';
import { firstName } from '@/features/library/utils/listMembers';
import { groupJoinFrontendUrl } from '@/features/groups/api/groupsApi';
import type { FriendGroupSummary } from '@/features/events/api/myGroupsApi';
import {
  useGroupInvitableUsers,
  useGroupMemberActions,
  useGroupMembers,
} from '@/features/groups/hooks/useGroups';

type MembersDialogGroup = Pick<FriendGroupSummary, 'id' | 'name' | 'role' | 'ownerDisplayName'>;

export default function GroupMembersDialog({
  group,
  onClose,
}: Readonly<{ group: MembersDialogGroup; onClose: () => void }>) {
  const { t } = useTranslation();
  const isOwner = group.role === 'owner';
  const roster = useGroupMembers(group.id);
  const invitable = useGroupInvitableUsers(group.id, isOwner && roster.isSuccess);
  const actions = useGroupMemberActions(group.id);
  const help = isOwner
    ? t('groups.members.ownerHelp')
    : t('groups.members.memberHelp', { name: firstName(group.ownerDisplayName) });

  return (
    <MembersDialog
      title={t('groups.members.title', { name: group.name })}
      help={help}
      copy="groups.members"
      isOwner={isOwner}
      roster={roster}
      invitable={invitable}
      actions={actions}
      inviteTarget={{ url: groupJoinFrontendUrl, shareTitle: group.name, surface: 'group' }}
      onClose={onClose}
    />
  );
}
