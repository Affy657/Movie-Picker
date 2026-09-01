import clsx from 'clsx';
import { useTranslation } from '@/shared/i18n';
import type { HistoryOutcome, HistoryRole } from './useHistoryToolbar';
import styles from './HistoryFiltersPanel.module.css';

interface HistoryFiltersPanelProps {
  panelId: string;
  roles: Set<HistoryRole>;
  onToggleRole: (role: HistoryRole) => void;
  outcomes: Set<HistoryOutcome>;
  onToggleOutcome: (outcome: HistoryOutcome) => void;
}

export default function HistoryFiltersPanel({
  panelId,
  roles,
  onToggleRole,
  outcomes,
  onToggleOutcome,
}: Readonly<HistoryFiltersPanelProps>) {
  const { t } = useTranslation();

  return (
    <div id={panelId} className={styles.panel}>
      <div className={styles.group} role="group" aria-labelledby={`${panelId}-role-label`}>
        <span id={`${panelId}-role-label`} className={styles.groupLabel}>
          {t('events.myEvents.filtersRoleLabel')}
        </span>
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

      <div className={styles.group} role="group" aria-labelledby={`${panelId}-outcome-label`}>
        <span id={`${panelId}-outcome-label`} className={styles.groupLabel}>
          {t('events.myEvents.filtersOutcomeLabel')}
        </span>
        <div className={styles.chipRow}>
          <button
            type="button"
            className={clsx(styles.chip, outcomes.has('withWinner') && styles.chipActive)}
            onClick={() => onToggleOutcome('withWinner')}
            aria-pressed={outcomes.has('withWinner')}
          >
            <span className={styles.chipLabel}>
              {t('events.myEvents.filtersOutcomeWithWinner')}
            </span>
          </button>
          <button
            type="button"
            className={clsx(styles.chip, outcomes.has('withoutWinner') && styles.chipActive)}
            onClick={() => onToggleOutcome('withoutWinner')}
            aria-pressed={outcomes.has('withoutWinner')}
          >
            <span className={styles.chipLabel}>
              {t('events.myEvents.filtersOutcomeWithoutWinner')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
