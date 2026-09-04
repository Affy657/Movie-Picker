import type { ReactNode } from 'react';
import { Link } from 'react-router';
import EmptyState from '@/shared/components/EmptyState';
import { withReturnTo, ROUTES } from '@/app/routes';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useTranslation } from '@/shared/i18n';

type SignedOutStateProps = {
  icon: ReactNode;
  title?: string;
  message: ReactNode;
  returnTo: string;
  compact?: boolean;
};

export default function SignedOutState({
  icon,
  title,
  message,
  returnTo,
  compact,
}: Readonly<SignedOutStateProps>) {
  const { t } = useTranslation();
  const { track } = useAnalytics();

  return (
    <EmptyState
      icon={icon}
      title={title}
      message={message}
      compact={compact}
      actions={
        <>
          <Link
            to={withReturnTo(ROUTES.login, returnTo)}
            className="btn btn-primary"
            onClick={() => track('signed_out_cta_clicked', { page: returnTo, cta: 'login' })}
          >
            {t('home.ctaLogin')}
          </Link>
          <Link
            to={withReturnTo(ROUTES.register, returnTo)}
            className="btn"
            onClick={() => track('signed_out_cta_clicked', { page: returnTo, cta: 'register' })}
          >
            {t('home.ctaRegister')}
          </Link>
        </>
      }
    />
  );
}
