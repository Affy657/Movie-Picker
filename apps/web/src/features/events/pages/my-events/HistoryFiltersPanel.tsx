import clsx from 'clsx';
import { useTranslation } from '@/shared/i18n';
import type { HistoryRole } from './useHistoryToolbar';
import styles from './HistoryFiltersPanel.module.css';

interface HistoryFiltersPanelProps {
  panelId: string;
  roles: Set<HistoryRole>;
  onToggleRole: (role: HistoryRole) => void;
}

export default function HistoryFiltersPanel({
  panelId,
  roles,
  onToggleRole,
}: Readonly<HistoryFiltersPanelProps>) {
  const { t } = useTranslation();

  return (
    <div id={panelId} className={styles.panel}>
      <span className={styles.groupLabel}>{t('events.myEvents.filtersRoleLabel')}</span>
      <div className={styles.chipRow}>
        <button
          type="button"
          className={clsx(styles.chip, roles.has('hosted') && styles.chipActive)}
          onClick={() => onToggleRole('hosted')}
          aria-pressed={roles.has('hosted')}
        >
          <span className={styles.chipLabel}>{t('events.myEvents.filtersRoleHosted')}</span>
        </button>
        <button
          type="button"
          className={clsx(styles.chip, roles.has('joined') && styles.chipActive)}
          onClick={() => onToggleRole('joined')}
          aria-pressed={roles.has('joined')}
        >
          <span className={styles.chipLabel}>{t('events.myEvents.filtersRoleJoined')}</span>
        </button>
      </div>
    </div>
  );
}
