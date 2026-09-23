import Chip from '@/shared/components/Chip';
import styles from './ActiveFilterChips.module.css';
import LinkButton from '@/shared/components/LinkButton';

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
        <Chip
          key={chip.key}
          tone="primary"
          onRemove={chip.onRemove}
          removeAriaLabel={removeAriaLabel}
        >
          {chip.label}
        </Chip>
      ))}
      {onClearAll && clearAllLabel ? (
        <LinkButton size="sm" onClick={onClearAll}>
          {clearAllLabel}
        </LinkButton>
      ) : null}
    </div>
  );
}
