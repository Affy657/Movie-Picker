import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import ErrorState from '@/shared/components/ErrorState';
import { ROUTES } from '@/app/routes';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle(pageTitle('Page introuvable'));

  return (
    <ErrorState
      icon={<Compass size={32} />}
      code="Erreur 404"
      title="Page introuvable"
      message="Cette page n'existe pas ou a été déplacée. Pas de panique, on vous remet sur les rails."
      actions={
        <Link to={ROUTES.home} className="btn btn-primary">
          Retour à l&apos;accueil
        </Link>
      }
    />
  );
}
