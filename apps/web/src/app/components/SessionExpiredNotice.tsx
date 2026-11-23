import { Link, useLocation } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import Notice from '@/shared/components/Notice';
import { buttonClass } from '@/shared/components/Button';
import { returnToOf } from '@/shared/utils/returnTo';
import { ROUTES, withReturnTo } from '@/app/routes';

const SIGN_IN_ROUTES: ReadonlySet<string> = new Set([
  ROUTES.login,
  ROUTES.register,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
]);

export default function SessionExpiredNotice() {
  const { t } = useTranslation();
  const { sessionExpired, dismissSessionExpired } = useAuth();
  const location = useLocation();

  if (!sessionExpired || SIGN_IN_ROUTES.has(location.pathname)) return null;

  return (
    <Notice
      title={t('auth.sessionExpired.title')}
      description={t('auth.sessionExpired.description')}
      onClose={dismissSessionExpired}
    >
      <Link
        to={withReturnTo(ROUTES.login, returnToOf(location))}
        className={buttonClass({ variant: 'primary', size: 'sm' })}
        onClick={dismissSessionExpired}
      >
        {t('auth.sessionExpired.signInAgain')}
      </Link>
    </Notice>
  );
}
