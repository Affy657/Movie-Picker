import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import Spinner from './Spinner';
import styles from './IconButton.module.css';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonTone = 'default' | 'danger' | 'onPoster';
export type IconButtonShape = 'square' | 'round';

const SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: styles.sm!,
  md: styles.md!,
  lg: styles.lg!,
};

const TONE_CLASS: Record<IconButtonTone, string | null> = {
  default: null,
  danger: styles.danger!,
  onPoster: styles.onPoster!,
};

export function iconButtonClass({
  size = 'md',
  tone = 'default',
  shape = 'square',
  expandHitArea = true,
  className,
}: Readonly<{
  size?: IconButtonSize;
  tone?: IconButtonTone;
  shape?: IconButtonShape;
  expandHitArea?: boolean;
  className?: string;
}> = {}): string {
  return clsx(
    styles.root,
    SIZE_CLASS[size],
    TONE_CLASS[tone],
    shape === 'round' && styles.round,
    expandHitArea && styles.expandedHitArea,
    className
  );
}

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  ariaLabel: string;
  size?: IconButtonSize;
  tone?: IconButtonTone;
  shape?: IconButtonShape;
  showTitle?: boolean;
  expandHitArea?: boolean;
  loading?: boolean;
  children: ReactNode;
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    ariaLabel,
    size = 'md',
    tone = 'default',
    shape = 'square',
    showTitle = true,
    expandHitArea = true,
    loading = false,
    disabled,
    className,
    type = 'button',
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      title={showTitle ? ariaLabel : undefined}
      className={iconButtonClass({ size, tone, shape, expandHitArea, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
});

export default IconButton;
