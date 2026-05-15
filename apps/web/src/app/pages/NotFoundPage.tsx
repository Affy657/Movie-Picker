import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  useDocumentTitle(pageTitle('Page introuvable'));

  return (
    <PageLayout className={styles.layout}>
      <span className={styles.iconWrap} aria-hidden>
        <Compass size={32} />
      </span>
      <p className={styles.code}>Erreur 404</p>
      <h1 className={styles.title}>Page introuvable</h1>
      <p className={styles.message}>
        Cette page n&apos;existe pas ou a été déplacée. Pas de panique, on vous remet sur les rails.
      </p>
      <div className={styles.actions}>
        <Link to={ROUTES.home} className="btn btn-primary">
          Retour à l&apos;accueil
        </Link>
      </div>
    </PageLayout>
  );
}
