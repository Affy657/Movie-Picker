import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import AuthPageShell, { authPageShellStyles } from '@/features/auth/components/AuthPageShell';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { postEmailVerificationConfirm } from '@/features/auth/api/authApi';
import PageLayout from '@/shared/components/PageLayout';
import Button, { buttonClass } from '@/shared/components/Button';
import Spinner from '@/shared/components/Spinner';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { API_ERROR_REASONS, ApiError } from '@/shared/api/apiError';
import { ROUTES } from '@/app/routes';

type ConfirmationStatus = 'pending' | 'confirmed' | 'invalid' | 'failed';

const TOKEN_PARAM = 'token';

function isInvalidConfirmationLink(error: unknown): boolean {
  return ApiError.is(error) && error.reason === API_ERROR_REASONS.invalidEmailVerificationToken;
}

function useTokenHiddenFromTheAddressBar(): string {
  const [params, setParams] = useSearchParams();
  const [token] = useState(() => (params.get(TOKEN_PARAM) ?? '').trim());

  useEffect(() => {
    if (!params.has(TOKEN_PARAM)) return;
    const withoutToken = new URLSearchParams(params);
    withoutToken.delete(TOKEN_PARAM);
    setParams(withoutToken, { replace: true });
  }, [params, setParams]);

  return token;
}

function useConfirmation(token: string) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConfirmationStatus>(token ? 'pending' : 'invalid');
  const [attempt, setAttempt] = useState(0);
  const sentAttemptRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token || sentAttemptRef.current === attempt) return;
    sentAttemptRef.current = attempt;
    postEmailVerificationConfirm(token).then(
      () => {
        setStatus('confirmed');
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      },
      (error: unknown) => setStatus(isInvalidConfirmationLink(error) ? 'invalid' : 'failed')
    );
  }, [token, attempt, queryClient]);

  const retry = () => {
    setStatus('pending');
    setAttempt((previous) => previous + 1);
  };

  return { status, retry };
}

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  useNoindexPage(pageTitle(t('auth.verifyEmail.title')), ROUTES.verifyEmail);
  const { user } = useAuth();
  const token = useTokenHiddenFromTheAddressBar();
  const { status, retry } = useConfirmation(token);
  const primaryLink = buttonClass({ variant: 'primary' });

  if (status === 'pending') {
    return (
      <PageLayout className={authPageShellStyles.layout}>
        <AuthPageShell
          title={t('auth.verifyEmail.title')}
          description={t('auth.verifyEmail.pendingDescription')}
        >
          <Spinner />
        </AuthPageShell>
      </PageLayout>
    );
  }

  if (status === 'failed') {
    return (
      <PageLayout className={authPageShellStyles.layout}>
        <AuthPageShell
          title={t('auth.verifyEmail.title')}
          description={t('auth.verifyEmail.errorMessage')}
        >
          <Button variant="primary" onClick={retry}>
            {t('auth.verifyEmail.retry')}
          </Button>
        </AuthPageShell>
      </PageLayout>
    );
  }

  if (status === 'invalid') {
    return (
      <PageLayout className={authPageShellStyles.layout}>
        <AuthPageShell
          title={t('auth.verifyEmail.invalidTitle')}
          description={t(
            token ? 'auth.verifyEmail.invalidMessage' : 'auth.verifyEmail.missingTokenMessage'
          )}
        >
          <p>
            {user ? (
              <Link className={primaryLink} to={ROUTES.accountSecurity}>
                {t('auth.verifyEmail.goToSecurity')}
              </Link>
            ) : (
              <Link className={primaryLink} to={ROUTES.login}>
                {t('auth.verifyEmail.goToLogin')}
              </Link>
            )}
          </p>
        </AuthPageShell>
      </PageLayout>
    );
  }

  return (
    <PageLayout className={authPageShellStyles.layout}>
      <AuthPageShell
        title={t('auth.verifyEmail.successTitle')}
        description={t('auth.verifyEmail.successMessage')}
      >
        <p>
          {user ? (
            <Link className={primaryLink} to={ROUTES.home}>
              {t('auth.verifyEmail.goHome')}
            </Link>
          ) : (
            <Link className={primaryLink} to={ROUTES.login}>
              {t('auth.verifyEmail.goToLogin')}
            </Link>
          )}
        </p>
      </AuthPageShell>
    </PageLayout>
  );
}
