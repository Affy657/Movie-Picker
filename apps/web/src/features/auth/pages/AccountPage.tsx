import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { KeyRound, LogOut, Sliders, User } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import NotificationsSection from '@/features/notifications/components/NotificationsSection';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import ThemeToggle from '@/app/components/ThemeToggle';
import LanguageSelector from '@/app/components/LanguageSelector';
import AccentColorPicker from '@/app/components/AccentColorPicker';
import { withReturnTo, ROUTES } from '@/app/routes';
import { patchChangePassword } from '@/features/auth/api/authApi';
import { isRegisterPasswordCompliant } from '@/shared/utils/authPasswordRules';
import { queryKeys } from '@/shared/hooks/queryKeys';
import styles from './AccountPage.module.css';

const POST_PASSWORD_CHANGE_REDIRECT_MS = 1800;

function ChangePasswordSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const redirectTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(redirectTimerRef.current), []);

  const changeAction = useCallback(async () => {
    await patchChangePassword(currentPassword, newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSavedAt(Date.now());
    queryClient.setQueryData(queryKeys.auth.me, null);
    clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = window.setTimeout(() => {
      navigate(ROUTES.login, { replace: true });
    }, POST_PASSWORD_CHANGE_REDIRECT_MS);
  }, [currentPassword, newPassword, queryClient, navigate]);

  const {
    run: runChange,
    loading: changing,
    error: apiError,
    clearError,
  } = useAsyncAction(changeAction, t('auth.account.changePasswordFallbackError'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();
    setSavedAt(null);

    if (newPassword !== confirmPassword) {
      setValidationError(t('auth.account.changePasswordMustMatch'));
      return;
    }
    if (!isRegisterPasswordCompliant(newPassword)) {
      setValidationError(t('auth.account.changePasswordRulesError'));
      return;
    }
    void runChange();
  };

  const errorMsg = validationError ?? apiError;

  return (
    <section className="section section--panel" aria-labelledby="change-password-heading">
      <h2 id="change-password-heading" className={styles.sectionTitle}>
        <KeyRound size={18} aria-hidden />
        {t('auth.account.changePasswordTitle')}
      </h2>
      <form onSubmit={handleSubmit} className="form" autoComplete="off">
        {errorMsg && (
          <p id="change-pw-error" className="error" role="alert">
            {errorMsg}
          </p>
        )}
        {savedAt != null && !errorMsg && (
          <p className="hint" role="status" aria-live="polite">
            {t('auth.account.changePasswordSuccess')}
          </p>
        )}

        <label className="label" htmlFor="change-pw-current">
          {t('auth.account.changePasswordCurrentLabel')}
        </label>
        <input
          id="change-pw-current"
          type="password"
          className="input"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            setValidationError(null);
            clearError();
          }}
          required
          aria-describedby={errorMsg ? 'change-pw-error' : undefined}
        />

        <label className="label" htmlFor="change-pw-new">
          {t('auth.account.changePasswordNewLabel')}
        </label>
        <input
          id="change-pw-new"
          type="password"
          className="input"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setValidationError(null);
          }}
          required
          aria-describedby="change-pw-new-hint"
        />
        <p id="change-pw-new-hint" className="hint">
          {t('auth.account.changePasswordNewHint')}
        </p>

        <label className="label" htmlFor="change-pw-confirm">
          {t('auth.account.changePasswordConfirmLabel')}
        </label>
        <input
          id="change-pw-confirm"
          type="password"
          className="input"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setValidationError(null);
          }}
          required
        />

        <button type="submit" className="btn btn-primary" disabled={changing}>
          {changing
            ? t('auth.account.changePasswordSubmitting')
            : t('auth.account.changePasswordSubmit')}
        </button>
      </form>
    </section>
  );
}

function PreferencesSection() {
  const { t } = useTranslation();

  return (
    <section className="section section--panel" aria-labelledby="preferences-heading">
      <h2 id="preferences-heading" className={styles.sectionTitle}>
        <Sliders size={18} aria-hidden />
        {t('auth.account.preferencesTitle')}
      </h2>
      <div className="form">
        <label className="label" htmlFor="account-language">
          {t('auth.account.languageLabel')}
        </label>
        <LanguageSelector id="account-language" />

        <label className="label" htmlFor="account-theme">
          {t('auth.account.themeLabel')}
        </label>
        <ThemeToggle id="account-theme" />

        <label className="label" htmlFor="account-accent">
          {t('auth.account.accentColorLabel')}
        </label>
        <AccentColorPicker id="account-accent" />
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
      <PageLayout className={styles.layout}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('auth.account.title')}</h1>
        </header>
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
    <PageLayout className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('auth.account.title')}</h1>
        <p className={styles.email}>{user.emailMasked}</p>
      </header>

      <section className="section section--panel" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className={styles.sectionTitle}>
          <User size={18} aria-hidden />
          {t('auth.account.profileTitle')}
        </h2>
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

      <ChangePasswordSection />

      <PreferencesSection />

      <NotificationsSection />

      <section className="section section--panel" aria-labelledby="session-heading">
        <h2 id="session-heading" className={styles.sectionTitle}>
          <LogOut size={18} aria-hidden />
          {t('auth.account.sessionTitle')}
        </h2>
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
