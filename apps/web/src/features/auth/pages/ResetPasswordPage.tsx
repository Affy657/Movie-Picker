import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthPageShell, { authPageShellStyles } from '@/features/auth/components/AuthPageShell';
import PageLayout from '@/shared/components/PageLayout';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { postPasswordResetConfirm } from '@/features/auth/api/authApi';
import { ApiError } from '@/shared/api/apiError';

const PASSWORD_MIN_LENGTH = 8;

function isExpiredOrInvalidResetTokenMessage(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('token invalide') || m.includes('expir');
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  useDocumentTitle(pageTitle(t('auth.resetPassword.title')));

  const [params] = useSearchParams();
  const token = (params.get('token') ?? '').trim();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const confirmAction = useCallback(async () => {
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      throw new Error(t('auth.resetPassword.newPasswordHint'));
    }
    if (newPassword !== confirmPassword) {
      throw new Error(t('auth.resetPassword.passwordsMustMatch'));
    }
    try {
      await postPasswordResetConfirm(token, newPassword);
      setSuccess(true);
    } catch (e) {
      if (ApiError.is(e) && e.code === 400 && isExpiredOrInvalidResetTokenMessage(e.message)) {
        setTokenInvalid(true);
        return;
      }
      throw e;
    }
  }, [token, newPassword, confirmPassword, t]);

  const {
    run: submit,
    loading,
    error,
  } = useAsyncAction(confirmAction, t('auth.resetPassword.fallbackError'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  if (!token || tokenInvalid) {
    return (
      <PageLayout className={authPageShellStyles.layout}>
        <AuthPageShell
          title={t('auth.resetPassword.invalidTokenTitle')}
          description={t(
            !token
              ? 'auth.resetPassword.missingTokenError'
              : 'auth.resetPassword.invalidTokenMessage'
          )}
        >
          <p>
            <Link className="btn btn-primary" to={ROUTES.forgotPassword}>
              {t('auth.resetPassword.requestNewLink')}
            </Link>
          </p>
          <p className="muted">
            <Link to={ROUTES.login}>{t('auth.resetPassword.goToLogin')}</Link>
          </p>
        </AuthPageShell>
      </PageLayout>
    );
  }

  if (success) {
    return (
      <PageLayout className={authPageShellStyles.layout}>
        <AuthPageShell
          title={t('auth.resetPassword.successTitle')}
          description={t('auth.resetPassword.successMessage')}
        >
          <p>
            <Link className="btn btn-primary" to={ROUTES.login}>
              {t('auth.resetPassword.goToLogin')}
            </Link>
          </p>
        </AuthPageShell>
      </PageLayout>
    );
  }

  return (
    <PageLayout className={authPageShellStyles.layout}>
      <AuthPageShell
        title={t('auth.resetPassword.title')}
        description={t('auth.resetPassword.description')}
      >
        <form
          onSubmit={handleSubmit}
          className="form"
          aria-describedby={error ? 'reset-form-error' : undefined}
        >
          {error && (
            <p id="reset-form-error" className="error" role="alert">
              {error}
            </p>
          )}
          <label className="label" htmlFor="reset-new-password">
            {t('auth.resetPassword.newPasswordLabel')}
          </label>
          <input
            id="reset-new-password"
            type="password"
            className="input"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby="reset-pwd-hint"
          />
          <p className="hint" id="reset-pwd-hint">
            {t('auth.resetPassword.newPasswordHint')}
          </p>
          <label className="label" htmlFor="reset-confirm-password">
            {t('auth.resetPassword.confirmPasswordLabel')}
          </label>
          <input
            id="reset-confirm-password"
            type="password"
            className="input"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            aria-invalid={error ? true : undefined}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
          </button>
        </form>
      </AuthPageShell>
    </PageLayout>
  );
}
