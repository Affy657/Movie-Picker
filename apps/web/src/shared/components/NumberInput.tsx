import clsx from 'clsx';
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
}: NumberInputProps) {
  const numVal = value === '' ? null : Number(value);

  const decrement = () => {
    if (numVal === null) return;
    const next = numVal - step;
    if (min !== undefined && next < min) {
      onChange('');
    } else {
      onChange(String(next));
    }
  };

  const increment = () => {
    const base = numVal ?? (min ?? 1) - step;
    const next = base + step;
    if (max !== undefined && next > max) return;
    onChange(String(next));
  };

  const canDecrement = !disabled && numVal !== null;
  const canIncrement = !disabled && (max === undefined || (numVal ?? 0) < max);

  return (
    <div className={clsx(styles.wrap, className)}>
      <button
        type="button"
        className={styles.stepBtn}
        onClick={decrement}
        disabled={!canDecrement}
        aria-label="Diminuer"
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
        placeholder={placeholder}
        disabled={disabled}
        inputMode="numeric"
      />
      <button
        type="button"
        className={styles.stepBtn}
        onClick={increment}
        disabled={!canIncrement}
        aria-label="Augmenter"
        tabIndex={-1}
      >
        +
      </button>
    </div>
  );
}
