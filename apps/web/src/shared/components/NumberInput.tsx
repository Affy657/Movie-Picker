import clsx from 'clsx';
import { useTranslation } from '@/shared/i18n';
import styles from './NumberInput.module.css';

type NumberInputProps = {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  ariaDescribedBy?: string;
  unlimited?: { label: string; fallback: number };
};

export default function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  disabled,
  className,
  invalid,
  ariaDescribedBy,
  unlimited,
}: Readonly<NumberInputProps>) {
  const { t } = useTranslation();
  const numVal = value === '' ? null : Number(value);
  const isUnlimited = unlimited !== undefined && numVal === null;
  const reachesUnlimited = unlimited !== undefined && max !== undefined && numVal === max;

  const decrement = () => {
    if (isUnlimited) {
      onChange(String(unlimited.fallback));
      return;
    }
    if (numVal === null) return;
    const next = numVal - step;
    if (min !== undefined && next < min) return;
    onChange(String(next));
  };

  const increment = () => {
    if (reachesUnlimited) {
      onChange('');
      return;
    }
    const base = numVal ?? (min ?? 1) - step;
    const next = base + step;
    if (max !== undefined && next > max) return;
    onChange(String(next));
  };

  const canDecrement =
    !disabled && (isUnlimited || (numVal !== null && (min === undefined || numVal > min)));
  const canIncrement =
    !disabled && !isUnlimited && (reachesUnlimited || max === undefined || (numVal ?? 0) < max);

  return (
    <div className={clsx(styles.wrap, invalid && styles.wrapInvalid, className)}>
      <button
        type="button"
        className={styles.stepBtn}
        onClick={decrement}
        disabled={!canDecrement}
        aria-label={t('common.decrement')}
        tabIndex={-1}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        className={clsx('input', styles.input)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        placeholder={unlimited ? unlimited.label : placeholder}
        disabled={disabled}
        inputMode="numeric"
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
      />
      <button
        type="button"
        className={styles.stepBtn}
        onClick={increment}
        disabled={!canIncrement}
        aria-label={t('common.increment')}
        tabIndex={-1}
      >
        +
      </button>
    </div>
  );
}
