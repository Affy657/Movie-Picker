import { getErrorMessage } from '@/shared/api/apiError';

type Props = {
  error: unknown;
  onRetry: () => void;
};

export default function EventMoviesLoadError({ error, onRetry }: Readonly<Props>) {
  return (
    <div className="error movies-load-error" role="alert">
      <p>
        {getErrorMessage(
          error,
          'Impossible de charger la liste des films. Vérifiez votre connexion ou réessayez.'
        )}
      </p>
      <button type="button" className="btn btn-primary" onClick={() => onRetry()}>
        Réessayer
      </button>
    </div>
  );
}
