import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import Button, { buttonClass } from '@/shared/components/Button';

export default function SessionCheckErrorState() {
  const { t } = useTranslation();
  const { retryAuthCheck } = useAuth();

  return (
    <PageLayout className="page--centered page--errorState">
      <span className="errorStateIcon" aria-hidden>
        <AlertCircle size={32} />
      </span>
      <p className="errorStateMessage" role="alert">
        {t('auth.sessionCheck.failed')}
      </p>
      <Button type="button" variant="primary" onClick={retryAuthCheck}>
        {t('common.retry')}
      </Button>
      <Link to={ROUTES.home} className={buttonClass()}>
        {t('auth.sessionCheck.backHome')}
      </Link>
    </PageLayout>
  );
}
