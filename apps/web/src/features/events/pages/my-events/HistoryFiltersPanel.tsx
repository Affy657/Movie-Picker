import Chip from '@/shared/components/Chip';
import { useTranslation } from '@/shared/i18n';
import type { HistoryOutcome, HistoryRole } from './useHistoryToolbar';
import styles from './HistoryFiltersPanel.module.css';
import Card from '@/shared/components/Card';

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

  const roleChips: ReadonlyArray<[HistoryRole, string]> = [
    ['hosted', t('events.myEvents.filtersRoleHosted')],
    ['joined', t('events.myEvents.filtersRoleJoined')],
  ];

  const outcomeChips: ReadonlyArray<[HistoryOutcome, string]> = [
    ['withWinner', t('events.myEvents.filtersOutcomeWithWinner')],
    ['withoutWinner', t('events.myEvents.filtersOutcomeWithoutWinner')],
  ];

  return (
    <Card id={panelId} elevation="sm" className={styles.panel}>
      <fieldset className={styles.group}>
        <legend className={styles.groupLabel}>{t('events.myEvents.filtersRoleLabel')}</legend>
        <div className={styles.chipRow}>
          {roleChips.map(([role, label]) => (
            <Chip
              key={role}
              onClick={() => onToggleRole(role)}
              pressed={roles.has(role)}
              selected={roles.has(role)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupLabel}>{t('events.myEvents.filtersOutcomeLabel')}</legend>
        <div className={styles.chipRow}>
          {outcomeChips.map(([outcome, label]) => (
            <Chip
              key={outcome}
              onClick={() => onToggleOutcome(outcome)}
              pressed={outcomes.has(outcome)}
              selected={outcomes.has(outcome)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}
