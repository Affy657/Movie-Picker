import Chip from '@/shared/components/Chip';
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
        <Chip key={chip.key} tone="primary" onRemove={chip.onRemove} removeLabel={removeAriaLabel}>
          {chip.label}
        </Chip>
      ))}
      {onClearAll && clearAllLabel ? (
        <button type="button" className={styles.clearAll} onClick={onClearAll}>
          {clearAllLabel}
        </button>
      ) : null}
    </div>
  );
}
