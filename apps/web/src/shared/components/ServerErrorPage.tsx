import { Link } from 'react-router';
import { ServerCrash } from 'lucide-react';
import ErrorState from '@/shared/components/ErrorState';
import { ROUTES } from '@/app/routes';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation } from '@/shared/i18n';
import Button, { buttonClass } from '@/shared/components/Button';

type ServerErrorPageProps = {
  error?: Error | null;
  onRetry?: () => void;
};

export default function ServerErrorPage({ error, onRetry }: Readonly<ServerErrorPageProps>) {
  const { t } = useTranslation();
  useNoindexPage(pageTitle(t('errors.serverTitle')));

  const message = import.meta.env.PROD
    ? t('errors.boundary.messageProd')
    : (error?.message ?? t('errors.unexpected'));

  return (
    <ErrorState
      icon={<ServerCrash size={32} />}
      code={t('errors.serverCode')}
      title={t('errors.boundary.title')}
      message={message}
      messageRole="alert"
      actions={
        <>
          {onRetry ? (
            <Button type="button" variant="primary" onClick={onRetry}>
              {t('errors.boundary.retryButton')}
            </Button>
          ) : null}
          <Link to={ROUTES.home} className={buttonClass()}>
            {t('errors.boundary.homeButton')}
          </Link>
        </>
      }
    />
  );
}
