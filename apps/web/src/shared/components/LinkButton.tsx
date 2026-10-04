import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './LinkButton.module.css';
import { withNudgedText } from './Button';

export type LinkButtonSize = 'sm' | 'md';

const SIZE_CLASS: Record<LinkButtonSize, string> = {
  sm: styles.sm!,
  md: styles.md!,
};

export function linkButtonClass({
  size = 'md',
  className,
}: Readonly<{ size?: LinkButtonSize; className?: string }> = {}): string {
  return clsx(styles.root, SIZE_CLASS[size], className);
}

type LinkButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: LinkButtonSize;
  children: ReactNode;
};

const LinkButton = forwardRef<HTMLButtonElement, LinkButtonProps>(function LinkButton(
  { size = 'md', className, type = 'button', children, ...rest },
  ref
) {
  return (
    <button ref={ref} type={type} className={linkButtonClass({ size, className })} {...rest}>
      {withNudgedText(children)}
    </button>
  );
});

export default LinkButton;
