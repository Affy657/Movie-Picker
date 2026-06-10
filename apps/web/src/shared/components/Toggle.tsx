import styles from './Toggle.module.css';

interface Props {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
}

export default function Toggle({ checked, onChange, disabled, label }: Readonly<Props>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={styles.toggle}
      disabled={disabled}
      onClick={onChange}
    >
      <span className={styles.thumb} />
    </button>
  );
}
