import { Link, Navigate } from 'react-router';
import { AlertCircle, UserX } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import ErrorState from '@/shared/components/ErrorState';
import { ROUTES } from '@/app/routes';
import { ApiError } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { isOwnHandle } from '@/features/auth/utils/ownProfileDestination';
import { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';

export function ProfileNotFoundState({ handle }: Readonly<{ handle: string | undefined }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (isOwnHandle(user, handle)) {
    return <Navigate to={ROUTES.account} replace />;
  }
  return (
    <ErrorState
      icon={<UserX size={ICON_SIZE['4xl']} />}
      title={t('profile.notFoundTitle')}
      message={t('profile.notFound')}
      actions={
        <Link to={ROUTES.home} className={buttonClass({ variant: 'primary' })}>
          {t('errors.backHome')}
        </Link>
      }
    />
  );
}

export function ProfileLoadErrorState({ error }: Readonly<{ error: unknown }>) {
  const { t } = useTranslation();
  return (
    <PageLayout className="page--centered page--errorState">
      <span className="errorStateIcon" aria-hidden>
        <AlertCircle size={ICON_SIZE['4xl']} />
      </span>
      <p className="errorStateMessage" role="alert">
        {ApiError.is(error) ? error.message : t('profile.loadError')}
      </p>
    </PageLayout>
  );
}
