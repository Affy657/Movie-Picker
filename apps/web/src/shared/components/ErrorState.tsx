import type { ReactNode } from 'react';
import PageLayout from '@/shared/components/PageLayout';
import styles from './ErrorState.module.css';

type ErrorStateProps = {
  icon: ReactNode;
  code?: string;
  title: string;
  message: ReactNode;
  actions: ReactNode;
  messageRole?: 'alert' | 'status';
};

export default function ErrorState({
  icon,
  code,
  title,
  message,
  actions,
  messageRole,
}: Readonly<ErrorStateProps>) {
  return (
    <PageLayout className={styles.layout}>
      <span className={styles.iconWrap} aria-hidden>
        {icon}
      </span>
      {code ? <p className={styles.code}>{code}</p> : null}
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message} role={messageRole}>
        {message}
      </p>
      <div className={styles.actions}>{actions}</div>
    </PageLayout>
  );
}
