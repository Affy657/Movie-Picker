import { useTranslation } from '@/shared/i18n';
import type { MovieListAudience } from '@/features/library/api/listsApi';
import { listJoinFrontendUrl } from '@/features/library/api/listMembersApi';
import {
  useInvitableUsers,
  useListMemberActions,
  useListMembers,
} from '@/features/library/hooks/useListMembers';
import { firstName } from '@/features/library/utils/listMembers';
import MembersDialog from './MembersDialog';

interface MembersDialogList extends MovieListAudience {
  id: string;
  name: string;
}

export default function ListMembersDialog({
  list,
  onClose,
}: Readonly<{ list: MembersDialogList; onClose: () => void }>) {
  const { t } = useTranslation();
  const isOwner = list.role !== 'member';
  const roster = useListMembers(list.id);
  const invitable = useInvitableUsers(list.id, isOwner && roster.isSuccess);
  const actions = useListMemberActions(list.id);
  const help = isOwner
    ? t('lists.members.ownerHelp')
    : t('lists.members.memberHelp', { name: firstName(list.owner?.displayName ?? '') });

  return (
    <MembersDialog
      title={t('lists.members.title', { name: list.name })}
      help={help}
      copy="lists.members"
      isOwner={isOwner}
      roster={roster}
      invitable={invitable}
      actions={actions}
      inviteTarget={{ url: listJoinFrontendUrl, shareTitle: list.name, surface: 'list' }}
      onClose={onClose}
    />
  );
}
