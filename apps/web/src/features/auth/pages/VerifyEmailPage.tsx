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
import { useTranslation, type TranslationKey } from '@/shared/i18n';
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

const STATUS_COPY: Record<
  Exclude<ConfirmationStatus, 'invalid'>,
  { title: TranslationKey; description: TranslationKey }
> = {
  pending: { title: 'auth.verifyEmail.title', description: 'auth.verifyEmail.pendingDescription' },
  failed: { title: 'auth.verifyEmail.title', description: 'auth.verifyEmail.errorMessage' },
  confirmed: {
    title: 'auth.verifyEmail.successTitle',
    description: 'auth.verifyEmail.successMessage',
  },
};

function confirmationCopy(
  status: ConfirmationStatus,
  hasToken: boolean
): { title: TranslationKey; description: TranslationKey } {
  if (status !== 'invalid') return STATUS_COPY[status];
  return {
    title: 'auth.verifyEmail.invalidTitle',
    description: hasToken
      ? 'auth.verifyEmail.invalidMessage'
      : 'auth.verifyEmail.missingTokenMessage',
  };
}

function nextStepLink(
  status: 'confirmed' | 'invalid',
  signedIn: boolean
): { to: string; label: TranslationKey } {
  if (!signedIn) return { to: ROUTES.login, label: 'auth.verifyEmail.goToLogin' };
  if (status === 'invalid') {
    return { to: ROUTES.accountSecurity, label: 'auth.verifyEmail.goToSecurity' };
  }
  return { to: ROUTES.home, label: 'auth.verifyEmail.goHome' };
}

function ConfirmationAction({
  status,
  signedIn,
  onRetry,
}: Readonly<{ status: ConfirmationStatus; signedIn: boolean; onRetry: () => void }>) {
  const { t } = useTranslation();
  if (status === 'pending') return <Spinner />;
  if (status === 'failed') {
    return (
      <Button variant="primary" onClick={onRetry}>
        {t('auth.verifyEmail.retry')}
      </Button>
    );
  }
  const next = nextStepLink(status, signedIn);
  return (
    <p>
      <Link className={buttonClass({ variant: 'primary' })} to={next.to}>
        {t(next.label)}
      </Link>
    </p>
  );
}

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  useNoindexPage(pageTitle(t('auth.verifyEmail.title')), ROUTES.verifyEmail);
  const { user } = useAuth();
  const token = useTokenHiddenFromTheAddressBar();
  const { status, retry } = useConfirmation(token);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const copy = confirmationCopy(status, token !== '');

  const retryFromTheHeading = () => {
    titleRef.current?.focus();
    retry();
  };

  return (
    <PageLayout className={authPageShellStyles.layout}>
      <AuthPageShell
        title={t(copy.title)}
        description={t(copy.description)}
        titleRef={titleRef}
        announceDescription
      >
        <ConfirmationAction status={status} signedIn={!!user} onRetry={retryFromTheHeading} />
      </AuthPageShell>
    </PageLayout>
  );
}
