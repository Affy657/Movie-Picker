import type { ComponentType, ReactNode, SVGProps } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import styles from './Chip.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

export type ChipTone =
  'neutral' | 'primary' | 'success' | 'warning' | 'pending' | 'danger' | 'muted';

export type ChipSize = 'sm' | 'md';

type ChipProps = {
  tone?: ChipTone;
  size?: ChipSize;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
  children: ReactNode;
};

export default function Chip({
  tone = 'neutral',
  size = 'md',
  icon: Icon,
  selected,
  onClick,
  onRemove,
  removeLabel,
  ariaLabel,
  disabled = false,
  className,
  'data-testid': testId,
  children,
}: Readonly<ChipProps>) {
  const classes = clsx(
    styles.chip,
    styles[tone],
    size === 'sm' && styles.sm,
    onClick && styles.interactive,
    selected && styles.selected,
    className
  );

  const content = (
    <>
      {Icon ? (
        <Icon
          className={styles.icon}
          width={ICON_SIZE.xs}
          height={ICON_SIZE.xs}
          aria-hidden="true"
        />
      ) : null}
      <span className={styles.text}>{children}</span>
      {onRemove ? (
        <button type="button" className={styles.remove} onClick={onRemove} aria-label={removeLabel}>
          <X width={ICON_SIZE.xs} height={ICON_SIZE.xs} aria-hidden="true" />
        </button>
      ) : null}
    </>
  );

  if (onClick && !onRemove) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-pressed={selected}
        disabled={disabled}
        data-testid={testId}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={classes} data-testid={testId}>
      {content}
    </span>
  );
}
