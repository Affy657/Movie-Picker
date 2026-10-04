import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './StatusDot.module.css';

type StatusDotProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  pulsing?: boolean;
};

export default function StatusDot({
  pulsing = false,
  className,
  ...rest
}: Readonly<StatusDotProps>) {
  return (
    <span
      className={clsx(styles.dot, pulsing && styles.pulsing, className)}
      aria-hidden="true"
      {...rest}
    />
  );
}
