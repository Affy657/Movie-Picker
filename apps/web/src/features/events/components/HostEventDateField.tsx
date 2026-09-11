import { AlertCircle } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import styles from './HostEventSettingsPanel.module.css';

type Props = {
  value: string;
  error: string | undefined;
  relativeDateLabel: string | null;
  hintId: string;
  showNotifyRow: boolean;
  notifyDateChange: boolean;
  onValueChange: (value: string) => void;
  onNotifyChange: (checked: boolean) => void;
};

export default function HostEventDateField({
  value,
  error,
  relativeDateLabel,
  hintId,
  showNotifyRow,
  notifyDateChange,
  onValueChange,
  onNotifyChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const describedBy = !error && relativeDateLabel ? hintId : undefined;

  return (
    <div className={styles.field}>
      <label className="label" htmlFor="host-cfg-datetime">
        {t('events.settings.dateTimeLabel')}
      </label>
      <input
        id="host-cfg-datetime"
        className="input"
        type="datetime-local"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <p className={styles.fieldError}>
          <AlertCircle size={12} aria-hidden />
          <span>{error}</span>
        </p>
      ) : (
        relativeDateLabel && (
          <p id={hintId} className="hint">
            {t('events.settings.dateHint', { relative: relativeDateLabel })}
          </p>
        )
      )}
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
