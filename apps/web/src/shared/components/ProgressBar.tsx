import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ProgressBar.module.css';

const MIN = 0;
const MAX = 100;

interface ProgressBarProps {
  value: number;
  label: ReactNode;
  className?: string;
}

export default function ProgressBar({ value, label, className }: Readonly<ProgressBarProps>) {
  const filled = Math.min(MAX, Math.max(MIN, value));
  return (
    <span className={clsx(styles.root, className)}>
      <span className={styles.track} aria-hidden="true">
        <span
          className={styles.fill}
          style={{ '--progress-value': `${filled}%` } as CSSProperties}
        />
      </span>
      <span className={styles.label}>{label}</span>
    </span>
  );
}
