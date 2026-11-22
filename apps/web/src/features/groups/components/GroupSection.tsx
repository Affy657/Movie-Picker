import { useId, type ReactNode } from 'react';
import styles from './GroupSection.module.css';

export default function GroupSection({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  const headingId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      {children}
    </section>
  );
}
