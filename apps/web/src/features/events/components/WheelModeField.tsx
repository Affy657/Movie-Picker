import clsx from 'clsx';
import type { WheelMode } from '@/features/events/types';
import { useTranslation } from '@/shared/i18n';
import styles from './WheelModeField.module.css';

type WheelModeFieldProps = {
  value: WheelMode;
  onChange: (mode: WheelMode) => void;
  name: string;
  labelId?: string;
};

export default function WheelModeField({
  value,
  onChange,
  name,
  labelId,
}: Readonly<WheelModeFieldProps>) {
  const { t } = useTranslation();

  return (
    <div className={styles.radioCards} role="radiogroup" aria-labelledby={labelId}>
      <label
        className={clsx(styles.radioCard, value === 'weightedByVotes' && styles.radioCardSelected)}
      >
        <input
          type="radio"
          name={name}
          className={styles.radioInput}
          checked={value === 'weightedByVotes'}
          onChange={() => onChange('weightedByVotes')}
          aria-label={t('events.settings.wheelModeWeightedLabel')}
        />
        <span>
          <span className={styles.radioName}>{t('events.settings.wheelModeWeightedLabel')}</span>
          <span className={styles.radioDesc}>{t('events.settings.wheelModeWeightedDesc')}</span>
        </span>
      </label>
      <label
        className={clsx(styles.radioCard, value === 'strictRandom' && styles.radioCardSelected)}
      >
        <input
          type="radio"
          name={name}
          className={styles.radioInput}
          checked={value === 'strictRandom'}
          onChange={() => onChange('strictRandom')}
          aria-label={t('events.settings.wheelModeStrictLabel')}
        />
        <span>
          <span className={styles.radioName}>{t('events.settings.wheelModeStrictLabel')}</span>
          <span className={styles.radioDesc}>{t('events.settings.wheelModeStrictDesc')}</span>
        </span>
      </label>
    </div>
  );
}
