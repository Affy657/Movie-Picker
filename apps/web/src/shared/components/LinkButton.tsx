import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './LinkButton.module.css';

export type LinkButtonSize = 'sm' | 'md';

const SIZE_CLASS: Record<LinkButtonSize, string> = {
  sm: styles.sm!,
  md: styles.md!,
};

type LinkButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: LinkButtonSize;
  children: ReactNode;
};

const LinkButton = forwardRef<HTMLButtonElement, LinkButtonProps>(function LinkButton(
  { size = 'sm', className, type = 'button', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(styles.root, SIZE_CLASS[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
});

export default LinkButton;
