import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import ErrorState from '@/shared/components/ErrorState';
import { ROUTES } from '@/app/routes';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation } from '@/shared/i18n';

export default function NotFoundPage() {
  const { t } = useTranslation();
  useNoindexPage(pageTitle(t('errors.notFound')));

  return (
    <ErrorState
      icon={<Compass size={32} />}
      code={t('errors.notFoundCode')}
      title={t('errors.notFound')}
      message={t('errors.notFoundMessage')}
      actions={
        <Link to={ROUTES.discover} className="btn btn-primary">
          {t('errors.backHome')}
        </Link>
      }
    />
  );
}
