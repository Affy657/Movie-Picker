import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './IconButton.module.css';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonTone = 'default' | 'danger' | 'onPoster';

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

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  label: string;
  size?: IconButtonSize;
  tone?: IconButtonTone;
  showTitle?: boolean;
  expandHitArea?: boolean;
  children: ReactNode;
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    size = 'md',
    tone = 'default',
    showTitle = true,
    expandHitArea = true,
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
      aria-label={label}
      title={showTitle ? label : undefined}
      className={clsx(
        styles.root,
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        expandHitArea && styles.expandedHitArea,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export default IconButton;
