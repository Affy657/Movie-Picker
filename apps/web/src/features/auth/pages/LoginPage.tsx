import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthPageShell, { authPageShellStyles } from '@/features/auth/components/AuthPageShell';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import {
  DEV_QUICK_LOGIN_EMAIL,
  DEV_QUICK_LOGIN_PASSWORD,
} from '@/features/auth/devQuickLoginCredentials';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { safeReturnTo } from '@/shared/utils/returnTo';
import { withReturnTo, ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import styles from './LoginPage.module.css';

type LoginSubmitMode = 'form' | 'devQuick';

export default function LoginPage() {
  const { t } = useTranslation();
  useDocumentTitle(pageTitle(t('auth.login.title')));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));

  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginAction = useCallback(
    async (mode: LoginSubmitMode) => {
      if (mode === 'devQuick') {
        await login(DEV_QUICK_LOGIN_EMAIL, DEV_QUICK_LOGIN_PASSWORD);
      } else {
        await login(email.trim(), password);
      }
      navigate(returnTo, { replace: true });
    },
    [email, password, login, navigate, returnTo]
  );

  const {
    run: submit,
    loading,
    error,
  } = useAsyncAction(loginAction, t('auth.login.fallbackError'));

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit('form');
  };

  const handleDevQuickLogin = () => {
    setEmail(DEV_QUICK_LOGIN_EMAIL);
    setPassword(DEV_QUICK_LOGIN_PASSWORD);
    void submit('devQuick');
  };

  return (
    <PageLayout className={authPageShellStyles.layout}>
      <AuthPageShell title={t('auth.login.title')} description={t('auth.login.description')}>
        <form
          onSubmit={handleSubmit}
          className="form"
          aria-describedby={error ? 'login-form-error' : undefined}
        >
          {error && (
            <p id="login-form-error" className="error" role="alert">
              {error}
            </p>
          )}
          <label className="label" htmlFor="login-email">
            {t('auth.login.emailLabel')}
          </label>
          <input
            id="login-email"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={error ? true : undefined}
          />
          <label className="label" htmlFor="login-password">
            {t('auth.login.passwordLabel')}
          </label>
          <input
            id="login-password"
            type="password"
            className="input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-invalid={error ? true : undefined}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>
          {import.meta.env.DEV ? (
            <div className={styles.devQuickLogin}>
              <button
                type="button"
                className="btn"
                disabled={loading}
                onClick={handleDevQuickLogin}
                aria-label={t('auth.login.devQuickAriaLabel')}
              >
                {t('auth.login.devQuickButton')}
              </button>
              <p className={`muted ${styles.devQuickLoginHint}`}>{t('auth.login.devQuickHint')}</p>
            </div>
          ) : null}
        </form>
        <p className="muted">
          <Link to={ROUTES.forgotPassword}>{t('auth.login.forgotPasswordLink')}</Link>
        </p>
        <p className="muted">
          {t('auth.login.registerPrompt')}{' '}
          <Link to={withReturnTo(ROUTES.register, returnTo)}>{t('auth.login.registerLink')}</Link>
        </p>
      </AuthPageShell>
    </PageLayout>
  );
}
