import { useTranslation } from '@/shared/i18n';
import Field from '@/shared/components/Field';
import {
  earliestOpenStartLocal,
  latestEventDate,
} from '@/features/events/lib/createEventValidation';
import { browserClockDiffersFromEventZone } from '@/shared/utils/eventScheduled';
import styles from './HostEventSettingsPanel.module.css';

type Props = {
  value: string;
  error: string | undefined;
  relativeDateLabel: string | null;
  showNotifyRow: boolean;
  notifyDateChange: boolean;
  onValueChange: (value: string) => void;
  onCommit: () => void;
  onNotifyChange: (checked: boolean) => void;
};

export default function HostEventDateField({
  value,
  error,
  relativeDateLabel,
  showNotifyRow,
  notifyDateChange,
  onValueChange,
  onCommit,
  onNotifyChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const now = new Date();
  const label = t('events.settings.dateTimeLabel');

  return (
    <div
      className={styles.field}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onCommit();
      }}
    >
      <Field
        label={
          browserClockDiffersFromEventZone(now.getTime())
            ? t('events.detail.parisTime', { value: label })
            : label
        }
        htmlFor="host-cfg-datetime"
        error={error}
        hint={
          !error && relativeDateLabel
            ? t('events.settings.dateHint', { relative: relativeDateLabel })
            : undefined
        }
        className={styles.field}
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            className="input"
            type="datetime-local"
            value={value}
            min={earliestOpenStartLocal(now)}
            max={`${latestEventDate(now)}T23:59`}
            onChange={(e) => onValueChange(e.target.value)}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      {showNotifyRow && (
        <label className={styles.notifyRow}>
          <input
            type="checkbox"
            className={styles.notifyCheckbox}
            checked={notifyDateChange}
            onChange={(e) => onNotifyChange(e.target.checked)}
          />
          <span>{t('events.settings.notifyDateChangeLabel')}</span>
        </label>
      )}
    </div>
  );
}
