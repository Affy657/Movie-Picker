import { useCallback, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import AuthPageShell, { authPageShellStyles } from '@/features/auth/components/AuthPageShell';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import OAuthProviderButtons from '@/features/auth/components/OAuthProviderButtons';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { safeReturnTo } from '@/shared/utils/returnTo';
import { withReturnTo, ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import { isRegisterPasswordCompliant } from '@/shared/utils/authPasswordRules';
import Button from '@/shared/components/Button';
import Field from '@/shared/components/Field';

export default function RegisterPage() {
  const { t } = useTranslation();
  useNoindexPage(pageTitle(t('auth.register.title')), ROUTES.register);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));

  const { register, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rulesError, setRulesError] = useState<string | null>(null);

  const registerAction = useCallback(async () => {
    await register(email.trim(), password, displayName.trim());
    navigate(returnTo, { replace: true });
  }, [email, password, displayName, register, navigate, returnTo]);

  const {
    run: submit,
    loading,
    error,
  } = useAsyncAction(registerAction, t('auth.register.fallbackError'));

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRulesError(null);
    if (!isRegisterPasswordCompliant(password)) {
      setRulesError(t('auth.register.passwordRulesError'));
      return;
    }
    void submit();
  };

  if (user) return <Navigate to={returnTo} replace />;

  return (
    <PageLayout className={authPageShellStyles.layout}>
      <AuthPageShell title={t('auth.register.title')} description={t('auth.register.description')}>
        <form
          onSubmit={handleSubmit}
          className="form"
          aria-describedby={rulesError || error ? 'register-form-error' : undefined}
        >
          {error && (
            <p id="register-form-error" className="error" role="alert">
              {error}
            </p>
          )}
          <Field label={t('auth.register.pseudoLabel')} htmlFor="register-displayName">
            {({ id }) => (
              <input
                id={id}
                type="text"
                className="input"
                autoComplete="nickname"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={80}
                aria-invalid={error ? true : undefined}
              />
            )}
          </Field>
          <Field label={t('auth.register.emailLabel')} htmlFor="register-email">
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
          <Field
            label={t('auth.register.passwordLabel')}
            htmlFor="register-password"
            hint={t('auth.register.passwordRulesHint')}
            error={rulesError ?? undefined}
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="password"
                className="input"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setRulesError(null);
                }}
                required
                minLength={8}
                aria-describedby={describedBy}
                aria-invalid={invalid || error ? true : undefined}
              />
            )}
          </Field>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? t('auth.register.submitting') : t('auth.register.submit')}
          </Button>
        </form>
        <OAuthProviderButtons returnTo={returnTo} />
        <p className="muted">
          {t('auth.register.loginPrompt')}{' '}
          <Link to={withReturnTo(ROUTES.login, returnTo)}>{t('auth.register.loginLink')}</Link>
        </p>
      </AuthPageShell>
    </PageLayout>
  );
}
