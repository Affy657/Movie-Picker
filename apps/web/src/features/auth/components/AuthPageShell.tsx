import { Link } from 'react-router';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import styles from './AuthPageShell.module.css';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';

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
        <ArrowLeft size={ICON_SIZE.md} aria-hidden />
        <span className={styles.backLinkLabel}>{t('nav.home')}</span>
      </Link>
      <Card padding="none" radius="lg" elevation="md" className={styles.card}>
        <span className={styles.cardAccent} aria-hidden />
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
        {children}
      </Card>
    </>
  );
}

export { styles as authPageShellStyles };
