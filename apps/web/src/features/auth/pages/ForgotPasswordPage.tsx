import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthPageShell from '@/features/auth/components/AuthPageShell';
import PageLayout from '@/shared/components/PageLayout';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { postPasswordResetRequest } from '@/features/auth/api/authApi';

export default function ForgotPasswordPage() {
  const { t, locale } = useTranslation();
  useDocumentTitle(pageTitle(t('auth.forgotPassword.title')));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  if (submitted) {
    return (
      <PageLayout>
        <AuthPageShell
          title={t('auth.forgotPassword.successTitle')}
          description={t('auth.forgotPassword.successMessage')}
        >
          <p className="muted">
            <Link to={ROUTES.login}>{t('auth.forgotPassword.backToLogin')}</Link>
          </p>
        </AuthPageShell>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
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
          <label className="label" htmlFor="forgot-email">
            {t('auth.forgotPassword.emailLabel')}
          </label>
          <input
            id="forgot-email"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={error ? true : undefined}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
          </button>
        </form>
        <p className="muted">
          <Link to={ROUTES.login}>{t('auth.forgotPassword.backToLogin')}</Link>
        </p>
      </AuthPageShell>
    </PageLayout>
  );
}
