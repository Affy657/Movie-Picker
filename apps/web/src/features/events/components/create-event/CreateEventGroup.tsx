import { useId } from 'react';
import GroupChips from '@/features/events/components/GroupChips';
import { useTranslation } from '@/shared/i18n';
import type { FriendGroupSummary } from '@/features/events/api/myGroupsApi';
import styles from './CreateEventDialog.module.css';

type CreateEventGroupProps = {
  groups: ReadonlyArray<FriendGroupSummary>;
  groupId: string | null;
  onChange: (groupId: string | null) => void;
};

export default function CreateEventGroup({
  groups,
  groupId,
  onChange,
}: Readonly<CreateEventGroupProps>) {
  const { t } = useTranslation();
  const headingId = useId();
  if (groups.length === 0) return null;

  const chosen = groups.find((group) => group.id === groupId) ?? null;

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionTitle}>
        {t('events.create.groupLabel')}
        <span className={styles.optional}>{t('events.create.optional')}</span>
      </h3>
      <GroupChips
        className={styles.chips}
        groups={groups}
        groupId={chosen?.id ?? null}
        onChange={onChange}
      />
      {chosen ? (
        <p className={styles.groupHint}>
          {chosen.memberCount > 1
            ? t('events.create.groupHint', { count: chosen.memberCount })
            : t('events.create.groupHintAlone')}
        </p>
      ) : null}
    </section>
  );
}
