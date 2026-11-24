import { useId, type ReactNode } from 'react';
import GroupChips from '@/features/events/components/GroupChips';
import type { FriendGroupSummary } from '@/features/events/api/myGroupsApi';
import { useTranslation } from '@/shared/i18n';
import styles from './NightForm.module.css';

type NightGroupFieldProps = {
  groups: ReadonlyArray<FriendGroupSummary>;
  groupId: string | null;
  onChange: (groupId: string | null) => void;
  disabled?: boolean;
  note?: ReactNode;
};

export default function NightGroupField({
  groups,
  groupId,
  onChange,
  disabled = false,
  note,
}: Readonly<NightGroupFieldProps>) {
  const { t } = useTranslation();
  const headingId = useId();
  if (groups.length === 0) return null;

  return (
    <section className={styles.block} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.blockTitle}>
        {t('events.create.groupLabel')}
      </h3>
      <GroupChips
        className={styles.chips}
        groups={groups}
        groupId={groupId}
        disabled={disabled}
        onChange={onChange}
      />
      {note}
    </section>
  );
}
