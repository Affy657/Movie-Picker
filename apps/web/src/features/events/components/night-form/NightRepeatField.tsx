import { Info } from 'lucide-react';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import ToggleRow from '@/shared/components/ToggleRow';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import type { EventRecurrence } from '@/features/events/types';
import styles from './NightForm.module.css';

type NightRepeatFieldProps = {
  recurrence: EventRecurrence | null;
  locked: boolean;
  onToggle: () => void;
  onRhythm: (recurrence: EventRecurrence) => void;
};

export default function NightRepeatField({
  recurrence,
  locked,
  onToggle,
  onRhythm,
}: Readonly<NightRepeatFieldProps>) {
  const { t } = useTranslation();
  const options: { value: EventRecurrence; label: string }[] = [
    { value: 'weekly', label: t('events.settings.recurrenceWeekly') },
    { value: 'biweekly', label: t('events.settings.recurrenceBiweekly') },
    { value: 'monthly', label: t('events.settings.recurrenceMonthly') },
  ];

  return (
    <div className={styles.block}>
      <ToggleRow
        title={t('events.form.repeat')}
        checked={recurrence !== null}
        disabled={locked}
        onChange={onToggle}
      />
      {recurrence !== null && !locked ? (
        <SegmentedRadioGroup
          className={styles.rhythm}
          options={options}
          value={recurrence}
          size="sm"
          ariaLabel={t('events.settings.recurrenceGroupLabel')}
          onChange={onRhythm}
        />
      ) : null}
      {locked ? (
        <p className={styles.message}>
          <Info size={ICON_SIZE.sm} aria-hidden />
          <span className={styles.messageText}>{t('events.settings.recurrenceLockedHint')}</span>
        </p>
      ) : null}
    </div>
  );
}
