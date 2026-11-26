import type { ReactNode, Ref } from 'react';
import BackLink from './BackLink';
import Card from './Card';
import styles from './FormPageShell.module.css';

type FormPageShellProps = {
  title: string;
  description?: string;
  back: { to: string; label: string };
  titleRef?: Ref<HTMLHeadingElement>;
  announceDescription?: boolean;
  children: ReactNode;
};

export default function FormPageShell({
  title,
  description,
  back,
  titleRef,
  announceDescription = false,
  children,
}: Readonly<FormPageShellProps>) {
  return (
    <>
      <BackLink to={back.to} className={styles.backLink}>
        {back.label}
      </BackLink>
      <Card padding="none" radius="lg" elevation="md" className={styles.card}>
        <span className={styles.cardAccent} aria-hidden />
        <h1 ref={titleRef} tabIndex={titleRef ? -1 : undefined} className={styles.title}>
          {title}
        </h1>
        {description && announceDescription ? (
          <p className={styles.description} role="status" aria-live="polite">
            {description}
          </p>
        ) : null}
        {description && !announceDescription ? (
          <p className={styles.description}>{description}</p>
        ) : null}
        {children}
      </Card>
    </>
  );
}
