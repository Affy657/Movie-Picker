import { Link } from 'react-router-dom';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle(pageTitle('Page introuvable'));

  return (
    <PageLayout>
      <h1>Page introuvable</h1>
      <p className="lead">Cette page n'existe pas ou a été déplacée.</p>
      <nav className="nav-actions">
        <Link to={ROUTES.home} className="btn btn-primary">
          Retour à l'accueil
        </Link>
      </nav>
    </PageLayout>
  );
}
