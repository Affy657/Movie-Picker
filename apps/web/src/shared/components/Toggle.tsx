import styles from './Toggle.module.css';

interface Props {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
  labelledBy?: string;
}

export default function Toggle({
  checked,
  onChange,
  disabled,
  label,
  labelledBy,
}: Readonly<Props>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className={styles.toggle}
      disabled={disabled}
      onClick={onChange}
    >
      <span className={styles.thumb} />
    </button>
  );
}
