import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';

type Props = {
  error: unknown;
  onRetry: () => void;
};

export default function EventMoviesLoadError({ error, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <div className="error movies-load-error" role="alert">
      <p>{getErrorMessage(error, t('events.detail.moviesLoadError'))}</p>
      <button type="button" className="btn btn-primary" onClick={() => onRetry()}>
        {t('common.retry')}
      </button>
    </div>
  );
}
