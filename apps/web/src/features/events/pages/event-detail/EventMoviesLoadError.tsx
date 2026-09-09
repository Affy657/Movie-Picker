import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import Button from '@/shared/components/Button';

type Props = {
  error: unknown;
  onRetry: () => void;
};

export default function EventMoviesLoadError({ error, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <div className="error movies-load-error" role="alert">
      <p>{getErrorMessage(error, t('events.detail.moviesLoadError'))}</p>
      <Button type="button" variant="primary" onClick={() => onRetry()}>
        {t('common.retry')}
      </Button>
    </div>
  );
}
