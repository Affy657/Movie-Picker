import styles from './ActiveFilterChips.module.css';

interface ActiveFilterChipItem {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: readonly ActiveFilterChipItem[];
  groupAriaLabel: string;
  removeAriaLabel: string;
  clearAllLabel?: string;
  onClearAll?: () => void;
}

export default function ActiveFilterChips({
  chips,
  groupAriaLabel,
  removeAriaLabel,
  clearAllLabel,
  onClearAll,
}: Readonly<ActiveFilterChipsProps>) {
  if (chips.length === 0) return null;

  return (
    <div className={styles.row} aria-label={groupAriaLabel}>
      {chips.map((chip) => (
        <span key={chip.key} className={styles.chip}>
          <span className={styles.label}>{chip.label}</span>
          <button
            type="button"
            className={styles.remove}
            onClick={chip.onRemove}
            aria-label={removeAriaLabel}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path
                d="M1 1l8 8M9 1 1 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </span>
      ))}
      {onClearAll && clearAllLabel ? (
        <button type="button" className={styles.clearAll} onClick={onClearAll}>
          {clearAllLabel}
        </button>
      ) : null}
    </div>
  );
}
