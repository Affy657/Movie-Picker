import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import AuthPageShell, { authPageShellStyles } from '@/features/auth/components/AuthPageShell';
import PageLayout from '@/shared/components/PageLayout';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import { ROUTES, withReturnTo } from '@/app/routes';
import { safeReturnTo } from '@/shared/utils/returnTo';
import { postPasswordResetRequest } from '@/features/auth/api/authApi';
import Button from '@/shared/components/Button';
import Field from '@/shared/components/Field';

export default function ForgotPasswordPage() {
  const { t, locale } = useTranslation();
  useNoindexPage(pageTitle(t('auth.forgotPassword.title')), ROUTES.forgotPassword);
  const [params] = useSearchParams();
  const loginTo = withReturnTo(ROUTES.login, safeReturnTo(params.get('returnTo')));
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const requestAction = useCallback(async () => {
    await postPasswordResetRequest(email.trim(), locale ?? 'fr');
    setSubmitted(true);
  }, [email, locale]);

  const {
    run: submit,
    loading,
    error,
  } = useAsyncAction(requestAction, t('auth.forgotPassword.fallbackError'));

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit();
  };

  if (submitted) {
    return (
      <PageLayout className={authPageShellStyles.layout}>
        <AuthPageShell
          title={t('auth.forgotPassword.successTitle')}
          description={t('auth.forgotPassword.successMessage')}
        >
          <p className="muted">
            <Link to={loginTo}>{t('auth.forgotPassword.backToLogin')}</Link>
          </p>
        </AuthPageShell>
      </PageLayout>
    );
  }

  return (
    <PageLayout className={authPageShellStyles.layout}>
      <AuthPageShell
        title={t('auth.forgotPassword.title')}
        description={t('auth.forgotPassword.description')}
      >
        <form
          onSubmit={handleSubmit}
          className="form"
          aria-describedby={error ? 'forgot-form-error' : undefined}
        >
          {error && (
            <p id="forgot-form-error" className="error" role="alert">
              {error}
            </p>
          )}
          <Field label={t('auth.forgotPassword.emailLabel')} htmlFor="forgot-email">
            {({ id }) => (
              <input
                id={id}
                type="email"
                className="input"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={error ? true : undefined}
              />
            )}
          </Field>
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            {loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
          </Button>
        </form>
        <p className="muted">
          <Link to={loginTo}>{t('auth.forgotPassword.backToLogin')}</Link>
        </p>
      </AuthPageShell>
    </PageLayout>
  );
}
