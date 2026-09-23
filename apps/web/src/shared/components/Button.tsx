import { Children, forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import Spinner from './Spinner';
import styles from './Button.module.css';
import { hasDescenders } from './opticalNudge';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost';

export type ButtonTone = 'default' | 'danger' | 'warning';

export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASS: Record<ButtonVariant, string | undefined> = {
  primary: styles.primary,
  secondary: undefined,
  soft: styles.soft,
  ghost: styles.ghost,
};

const TONE_CLASS: Record<ButtonTone, string | undefined> = {
  default: undefined,
  danger: styles.danger,
  warning: styles.warning,
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
  fullWidth = false,
  className,
}: Readonly<{
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}> = {}): string {
  return clsx(
    styles.btn,
    VARIANT_CLASS[variant],
    TONE_CLASS[tone],
    SIZE_CLASS[size],
    fullWidth && styles.fullWidth,
    className
  );
}

export function buttonLabelClass(text: string): string {
  return clsx(styles.label, !hasDescenders(text) && styles.labelCaps);
}

export function withNudgedText(children: ReactNode): ReactNode[] {
  const parts: ReactNode[] = [];
  let text = '';
  const flush = () => {
    const label = text.trim();
    if (label)
      parts.push(
        <span key={`label-${parts.length}`} className={buttonLabelClass(label)}>
          {label}
        </span>
      );
    text = '';
  };
  for (const child of Children.toArray(children)) {
    if (typeof child === 'string' || typeof child === 'number') {
      text += String(child);
      continue;
    }
    flush();
    parts.push(child);
  }
  flush();
  return parts;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    tone = 'default',
    size = 'md',
    fullWidth = false,
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
      className={buttonClass({ variant, tone, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {withNudgedText(children)}
    </button>
  );
});

export default Button;
