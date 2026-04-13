import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import ThemeToggle from '@/app/components/ThemeToggle';
import LanguageSelector from '@/app/components/LanguageSelector';
import { withReturnTo, ROUTES } from '@/app/routes';

function PreferencesSection() {
  const { t } = useTranslation();

  return (
    <section className="section section--panel" aria-labelledby="preferences-heading">
      <h2 id="preferences-heading">{t('auth.account.preferencesTitle')}</h2>
      <div className="form">
        <label className="label" htmlFor="account-language">
          {t('auth.account.languageLabel')}
        </label>
        <LanguageSelector id="account-language" />

        <label className="label" htmlFor="account-theme">
          {t('auth.account.themeLabel')}
        </label>
        <ThemeToggle id="account-theme" />
      </div>
    </section>
  );
}

export default function AccountPage() {
  const { t } = useTranslation();
  useDocumentTitle(pageTitle(t('auth.account.title')));
  const { user, isLoading, logout, patchProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
  }, [user]);

  const logoutAction = useCallback(() => logout(), [logout]);
  const {
    run: runLogout,
    loading: loggingOut,
    error: logoutError,
  } = useAsyncAction(logoutAction, t('auth.logout.fallbackError'));

  const saveAction = useCallback(async () => {
    await patchProfile({ displayName: displayName.trim() });
    setSavedAt(Date.now());
  }, [patchProfile, displayName]);
  const {
    run: runSave,
    loading: saving,
    error,
  } = useAsyncAction(saveAction, t('auth.account.fallbackError'));

  if (isLoading) {
    return (
      <PageLayout>
        <p className="placeholder" aria-busy="true">
          {t('auth.account.loadingPlaceholder')}
        </p>
      </PageLayout>
    );
  }

  if (!user) {
    return (
      <PageLayout>
        <h1>{t('auth.account.title')}</h1>
        <p className="lead">{t('auth.account.guestLead')}</p>

        <PreferencesSection />

        <nav className="nav-actions" aria-label={t('auth.account.guestNavAriaLabel')}>
          <Link to={withReturnTo(ROUTES.login, ROUTES.account)} className="btn btn-primary">
            {t('auth.account.loginCta')}
          </Link>
          <Link to={withReturnTo(ROUTES.register, ROUTES.account)} className="btn">
            {t('auth.account.registerCta')}
          </Link>
        </nav>
      </PageLayout>
    );
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSave();
  };

  return (
    <PageLayout>
      <h1>{t('auth.account.title')}</h1>
      <p className="muted">
        <span>{user.emailMasked}</span>
      </p>

      <section className="section section--panel" aria-labelledby="profile-heading">
        <h2 id="profile-heading">{t('auth.account.profileTitle')}</h2>
        <form onSubmit={handleProfileSubmit} className="form">
          {error && (
            <p id="account-form-error" className="error" role="alert">
              {error}
            </p>
          )}
          {savedAt != null && !error && (
            <p className="hint" role="status" aria-live="polite">
              {t('auth.account.saveSuccess')}
            </p>
          )}
          <label className="label" htmlFor="account-displayName">
            {t('auth.account.pseudoLabel')}
          </label>
          <input
            id="account-displayName"
            type="text"
            className="input"
            autoComplete="nickname"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSavedAt(null);
            }}
            required
            maxLength={80}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'account-form-error' : undefined}
          />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t('auth.account.saving') : t('common.save')}
          </button>
        </form>
      </section>

      <PreferencesSection />

      <section className="section section--panel" aria-labelledby="session-heading">
        <h2 id="session-heading">{t('auth.account.sessionTitle')}</h2>
        {logoutError && (
          <p className="error" role="alert">
            {logoutError}
          </p>
        )}
        <div className="nav-actions">
          <button
            type="button"
            className="btn btn-danger"
            disabled={loggingOut}
            onClick={() => void runLogout()}
          >
            {loggingOut ? t('auth.logout.submitting') : t('auth.account.logoutButton')}
          </button>
        </div>
      </section>
    </PageLayout>
  );
}
