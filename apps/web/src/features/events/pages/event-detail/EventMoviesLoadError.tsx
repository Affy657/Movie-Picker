import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import InlineError from '@/shared/components/InlineError';

type Props = {
  error: unknown;
  onRetry: () => void;
};

export default function EventMoviesLoadError({ error, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <InlineError
      message={getErrorMessage(error, t('events.detail.moviesLoadError'))}
      retryLabel={t('common.retry')}
      onRetry={onRetry}
    />
  );
}
