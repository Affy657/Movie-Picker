import { useId, type ReactNode } from 'react';
import CountBadge from '@/shared/components/CountBadge';
import styles from './GroupSection.module.css';

export default function GroupSection({
  title,
  count,
  detail,
  children,
}: Readonly<{ title: string; count?: number; detail?: string; children: ReactNode }>) {
  const headingId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        {title}
        {count === undefined ? null : (
          <>
            {' '}
            <CountBadge value={count} tone="neutral" />
          </>
        )}
        {detail ? (
          <>
            {' '}
            <span className={styles.detail}>{detail}</span>
          </>
        ) : null}
      </h2>
      {children}
    </section>
  );
}
