import { Link } from 'react-router';
import { AlertCircle } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';
import { ApiError } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';

export function ProfileNotFoundState() {
  const { t } = useTranslation();
  return (
    <PageLayout className="page--centered page--errorState">
      <span className="errorStateIcon" aria-hidden>
        <AlertCircle size={32} />
      </span>
      <p className="errorStateMessage" role="alert">
        {t('profile.notFound')}
      </p>
      <Link to={ROUTES.home} className="btn">
        {t('profile.backHome')}
      </Link>
    </PageLayout>
  );
}

export function ProfileLoadErrorState({ error }: Readonly<{ error: unknown }>) {
  const { t } = useTranslation();
  return (
    <PageLayout className="page--centered page--errorState">
      <span className="errorStateIcon" aria-hidden>
        <AlertCircle size={32} />
      </span>
      <p className="errorStateMessage" role="alert">
        {ApiError.is(error) ? error.message : t('profile.loadError')}
      </p>
    </PageLayout>
  );
}
