import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './EmptyState.module.css';

type EmptyStateProps = {
  icon: ReactNode;
  title?: string;
  message: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
};

export default function EmptyState({
  icon,
  title,
  message,
  actions,
  compact = false,
  className,
}: Readonly<EmptyStateProps>) {
  return (
    <div className={clsx(styles.root, compact && styles.compact, className)}>
      <span className={styles.iconWrap} aria-hidden>
        {icon}
      </span>
      {title ? <p className={styles.title}>{title}</p> : null}
      <p className={styles.message}>{message}</p>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
