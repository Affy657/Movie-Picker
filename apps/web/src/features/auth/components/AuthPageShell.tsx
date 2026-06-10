import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import styles from './AuthPageShell.module.css';

type AuthPageShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function AuthPageShell({ title, description, children }: Readonly<AuthPageShellProps>) {
  return (
    <>
      <Link to={ROUTES.home} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        Accueil
      </Link>
      <div className={styles.card}>
        <span className={styles.cardAccent} aria-hidden />
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
        {children}
      </div>
    </>
  );
}

export { styles as authPageShellStyles };
