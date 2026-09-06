import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASS: Record<ButtonVariant, string | null> = {
  primary: 'btn-primary',
  secondary: null,
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

const SIZE_CLASS: Record<ButtonSize, string | null> = {
  sm: 'btn-sm',
  md: null,
  lg: 'btn-lg',
};

export function buttonClass({
  variant = 'secondary',
  size = 'md',
  className,
}: Readonly<{ variant?: ButtonVariant; size?: ButtonSize; className?: string }> = {}): string {
  return clsx('btn', VARIANT_CLASS[variant], SIZE_CLASS[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', children, ...rest },
  ref
) {
  return (
    <button ref={ref} type={type} className={buttonClass({ variant, size, className })} {...rest}>
      {children}
    </button>
  );
});

export default Button;
