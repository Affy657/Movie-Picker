import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ThemeToggle.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export type SegmentedSize = 'md' | 'sm';

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
}: Readonly<{
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  ariaLabelledBy?: string;
  className?: string;
  id?: string;
  size?: SegmentedSize;
  iconOnly?: boolean;
}>) {
  const handleKey = (e: React.KeyboardEvent, idx: number) => {
    const last = options.length - 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(options[idx === last ? 0 : idx + 1]!.value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(options[idx === 0 ? last : idx - 1]!.value);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(options[0]!.value);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(options[last]!.value);
    }
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
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={showIconAlone ? opt.label : undefined}
            tabIndex={selected ? 0 : -1}
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
