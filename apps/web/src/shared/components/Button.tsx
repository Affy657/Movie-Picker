import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonTone = 'default' | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASS: Record<ButtonVariant, string | undefined> = {
  primary: styles.primary,
  secondary: undefined,
  ghost: styles.ghost,
};

const TONE_CLASS: Record<ButtonTone, string | undefined> = {
  default: undefined,
  danger: styles.danger,
};

const SIZE_CLASS: Record<ButtonSize, string | undefined> = {
  sm: styles.sm,
  md: undefined,
  lg: styles.lg,
};

export function buttonClass({
  variant = 'secondary',
  tone = 'default',
  size = 'md',
  className,
}: Readonly<{
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  className?: string;
}> = {}): string {
  return clsx(styles.btn, VARIANT_CLASS[variant], TONE_CLASS[tone], SIZE_CLASS[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    tone = 'default',
    size = 'md',
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
      className={buttonClass({ variant, tone, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

export default Button;
