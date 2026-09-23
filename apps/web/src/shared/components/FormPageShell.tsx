import type { ReactNode } from 'react';
import BackLink from './BackLink';
import Card from './Card';
import styles from './FormPageShell.module.css';

type FormPageShellProps = {
  title: string;
  description?: string;
  back: { to: string; label: string };
  children: ReactNode;
};

export default function FormPageShell({
  title,
  description,
  back,
  children,
}: Readonly<FormPageShellProps>) {
  return (
    <>
      <BackLink to={back.to} className={styles.backLink}>
        {back.label}
      </BackLink>
      <Card padding="none" radius="lg" elevation="md" className={styles.card}>
        <span className={styles.cardAccent} aria-hidden />
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
        {children}
      </Card>
    </>
  );
}
