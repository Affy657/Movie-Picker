import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './EmptyState.module.css';

type EmptyStateProps = {
  icon: ReactNode;
  title?: string;
  titleTag?: 'p' | 'h1' | 'h2';
  message: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
};

export default function EmptyState({
  icon,
  title,
  titleTag = 'p',
  message,
  actions,
  compact = false,
  className,
}: Readonly<EmptyStateProps>) {
  const TitleTag = titleTag;
  return (
    <div className={clsx(styles.root, compact && styles.compact, className)}>
      <span className={styles.iconWrap} aria-hidden>
        {icon}
      </span>
      {title ? <TitleTag className={styles.title}>{title}</TitleTag> : null}
      <p className={styles.message}>{message}</p>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
