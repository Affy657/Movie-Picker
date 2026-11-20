import Chip from '@/shared/components/Chip';
import { useTranslation } from '@/shared/i18n';
import type { FriendGroupSummary } from '@/features/events/api/myGroupsApi';

type GroupChipsProps = {
  className?: string;
  groups: ReadonlyArray<FriendGroupSummary>;
  groupId: string | null;
  disabled?: boolean;
  onChange: (groupId: string | null) => void;
};

export default function GroupChips({
  className,
  groups,
  groupId,
  disabled = false,
  onChange,
}: Readonly<GroupChipsProps>) {
  const { t } = useTranslation();
  return (
    <div className={className}>
      <Chip
        size="md"
        selected={groupId === null}
        disabled={disabled}
        onClick={() => onChange(null)}
      >
        {t('events.create.groupNone')}
      </Chip>
      {groups.map((group) => (
        <Chip
          key={group.id}
          size="md"
          selected={group.id === groupId}
          disabled={disabled}
          onClick={() => onChange(group.id)}
        >
          {group.name}
        </Chip>
      ))}
    </div>
  );
}
