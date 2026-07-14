import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthPageShell, { authPageShellStyles } from '@/features/auth/components/AuthPageShell';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { safeReturnTo } from '@/shared/utils/returnTo';
import { withReturnTo, ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import { isRegisterPasswordCompliant } from '@/shared/utils/authPasswordRules';

export default function RegisterPage() {
  const { t } = useTranslation();
  useDocumentTitle(pageTitle(t('auth.register.title')));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));

  const { register } = useAuth();
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRulesError(null);
    if (!isRegisterPasswordCompliant(password)) {
      setRulesError(t('auth.register.passwordRulesError'));
      return;
    }
    void submit();
  };

  return (
    <PageLayout className={authPageShellStyles.layout}>
      <AuthPageShell title={t('auth.register.title')} description={t('auth.register.description')}>
        <form
          onSubmit={handleSubmit}
          className="form"
          aria-describedby={rulesError || error ? 'register-form-error' : undefined}
        >
          {(rulesError || error) && (
            <p id="register-form-error" className="error" role="alert">
              {rulesError || error}
            </p>
          )}
          <label className="label" htmlFor="register-displayName">
            {t('auth.register.pseudoLabel')}
          </label>
          <input
            id="register-displayName"
            type="text"
            className="input"
            autoComplete="nickname"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={80}
            aria-invalid={error ? true : undefined}
          />
          <label className="label" htmlFor="register-email">
            {t('auth.register.emailLabel')}
          </label>
          <input
            id="register-email"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={error ? true : undefined}
          />
          <label className="label" htmlFor="register-password">
            {t('auth.register.passwordLabel')}
          </label>
          <input
            id="register-password"
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
            aria-invalid={rulesError || error ? true : undefined}
            aria-describedby="register-password-hint"
          />
          <p id="register-password-hint" className="hint">
            {t('auth.register.passwordRulesHint')}
          </p>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('auth.register.submitting') : t('auth.register.submit')}
          </button>
        </form>
        <p className="muted">
          {t('auth.register.loginPrompt')}{' '}
          <Link to={withReturnTo(ROUTES.login, returnTo)}>{t('auth.register.loginLink')}</Link>
        </p>
      </AuthPageShell>
    </PageLayout>
  );
}
