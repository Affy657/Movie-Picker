import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './CountBadge.module.css';

export type CountBadgeSize = 'sm' | 'md';
export type CountBadgeTone = 'primary' | 'success' | 'neutral';

const TONE_CLASS: Record<CountBadgeTone, string | undefined> = {
  primary: styles.primary,
  success: styles.success,
  neutral: styles.neutral,
};

type CountBadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  value: number | string;
  size?: CountBadgeSize;
  tone?: CountBadgeTone;
};

export default function CountBadge({
  value,
  size = 'md',
  tone = 'primary',
  className,
  ...rest
}: Readonly<CountBadgeProps>) {
  return (
    <span
      className={clsx(styles.badge, size === 'sm' && styles.sm, TONE_CLASS[tone], className)}
      {...rest}
    >
      <span className={styles.value}>{value}</span>
    </span>
  );
}
