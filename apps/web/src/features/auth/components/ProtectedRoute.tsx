import { AlertCircle } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTranslation } from '@/shared/i18n';
import { withReturnTo, ROUTES } from '@/app/routes';

type Props = { children: React.ReactNode };

export function ProtectedRoute({ children }: Readonly<Props>) {
  const { t } = useTranslation();
  const { user, isLoading, authCheckFailed, retryAuthCheck } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <PageLayout>
        <p className="placeholder">{t('common.loading')}</p>
      </PageLayout>
    );
  }

  if (!user && authCheckFailed) {
    return (
      <PageLayout className="page--centered page--errorState">
        <span className="errorStateIcon" aria-hidden>
          <AlertCircle size={32} />
        </span>
        <p className="errorStateMessage" role="alert">
          {t('auth.sessionCheck.failed')}
        </p>
        <button type="button" className="btn btn-primary" onClick={retryAuthCheck}>
          {t('common.retry')}
        </button>
        <Link to={ROUTES.home} className="btn">
          {t('auth.sessionCheck.backHome')}
        </Link>
      </PageLayout>
    );
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={withReturnTo(ROUTES.login, returnTo)} replace />;
  }

  return <>{children}</>;
}
