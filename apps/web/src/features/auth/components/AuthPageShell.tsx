import { Link } from 'react-router';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import styles from './AuthPageShell.module.css';

type AuthPageShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function AuthPageShell({
  title,
  description,
  children,
}: Readonly<AuthPageShellProps>) {
  const { t } = useTranslation();
  return (
    <>
      <Link to={ROUTES.home} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        <span className={styles.backLinkLabel}>{t('nav.home')}</span>
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
