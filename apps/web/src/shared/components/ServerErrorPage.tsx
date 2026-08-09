import { Link } from 'react-router';
import { ServerCrash } from 'lucide-react';
import ErrorState from '@/shared/components/ErrorState';
import { ROUTES } from '@/app/routes';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

type ServerErrorPageProps = {
  error?: Error | null;
  onRetry?: () => void;
};

export default function ServerErrorPage({ error, onRetry }: Readonly<ServerErrorPageProps>) {
  useDocumentTitle(pageTitle('Erreur serveur'));

  const message = import.meta.env.PROD
    ? 'Une erreur inattendue s’est produite. Vous pouvez réessayer ou recharger la page.'
    : (error?.message ?? 'Une erreur inattendue s’est produite.');

  return (
    <ErrorState
      icon={<ServerCrash size={32} />}
      code="Erreur 500"
      title="Un problème est survenu"
      message={message}
      messageRole="alert"
      actions={
        <>
          {onRetry ? (
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              Réessayer
            </button>
          ) : null}
          <Link to={ROUTES.home} className="btn">
            Accueil
          </Link>
        </>
      }
    />
  );
}
