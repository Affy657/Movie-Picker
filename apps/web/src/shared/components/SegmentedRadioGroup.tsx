import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './SegmentedRadioGroup.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export type SegmentedSize = 'md' | 'sm';

function arrowTargetIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

export default function SegmentedRadioGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  className = '',
  id,
  size = 'md',
  iconOnly = false,
  disabled = false,
}: Readonly<
  {
    options: readonly SegmentedOption<T>[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
    id?: string;
    size?: SegmentedSize;
    iconOnly?: boolean;
    disabled?: boolean;
  } & (
    { ariaLabel: string; ariaLabelledBy?: string } | { ariaLabelledBy: string; ariaLabel?: string }
  )
>) {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (disabled) return;
    const target = arrowTargetIndex(e.key, idx, options.length);
    if (target === null) return;
    e.preventDefault();
    onChange(options[target]!.value);
    optionRefs.current[target]?.focus();
  };

  const compact = size === 'sm';

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={clsx(styles.root, compact && styles.rootSm, className || undefined)}
    >
      {options.map((opt, idx) => {
        const selected = opt.value === value;
        const showIconAlone = iconOnly && Boolean(opt.icon);
        return (
          <button
            key={opt.value}
            ref={(el) => {
              optionRefs.current[idx] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={showIconAlone ? opt.label : undefined}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            className={clsx(
              styles.option,
              compact && styles.optionSm,
              showIconAlone && styles.optionIcon,
              selected && styles.optionSelected
            )}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKey(e, idx)}
          >
            {opt.icon}
            {showIconAlone ? null : opt.label}
          </button>
        );
      })}
    </div>
  );
}
