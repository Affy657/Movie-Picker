import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Download, KeyRound, Link2, LogOut, Sliders } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import NotificationsSection from '@/features/notifications/components/NotificationsSection';
import PublicProfileSection from '@/features/profile/components/PublicProfileSection';
import LetterboxdImportSection from '@/features/letterboxd/components/LetterboxdImportSection';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import ThemeToggle from '@/app/components/ThemeToggle';
import LanguageSelector from '@/app/components/LanguageSelector';
import AccentColorPicker from '@/app/components/AccentColorPicker';
import RatingScaleToggle from '@/app/components/RatingScaleToggle';
import { withReturnTo, ROUTES } from '@/app/routes';
import {
  deleteAccount,
  downloadMyDataExport,
  oauthStartUrl,
  patchChangePassword,
  unlinkOAuthProvider,
} from '@/features/auth/api/authApi';
import { useOAuthProviders } from '@/features/auth/hooks/useOAuthProviders';
import type { UserProfile } from '@/features/auth/types';
import { resolveOAuthErrorKey } from '@/features/auth/utils/oauthErrors';
import { isRegisterPasswordCompliant } from '@/shared/utils/authPasswordRules';
import { queryKeys } from '@/shared/hooks/queryKeys';
import styles from './AccountPage.module.css';

const PROVIDER_LABELS: Record<string, string> = { google: 'Google', github: 'GitHub' };

const POST_PASSWORD_CHANGE_REDIRECT_MS = 1800;

function ChangePasswordSection({ hasPassword }: Readonly<{ hasPassword: boolean }>) {
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
    await patchChangePassword(hasPassword ? currentPassword : '', newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSavedAt(Date.now());
    queryClient.setQueryData(queryKeys.auth.me, null);
    clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = globalThis.setTimeout(() => {
      navigate(ROUTES.login, { replace: true });
    }, POST_PASSWORD_CHANGE_REDIRECT_MS);
  }, [hasPassword, currentPassword, newPassword, queryClient, navigate]);

  const {
    run: runChange,
    loading: changing,
    error: apiError,
    clearError,
  } = useAsyncAction(
    changeAction,
    t(
      hasPassword
        ? 'auth.account.changePasswordFallbackError'
        : 'auth.account.setPasswordFallbackError'
    )
  );

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
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
        <span className={styles.sectionTitleText}>
          {t(hasPassword ? 'auth.account.changePasswordTitle' : 'auth.account.setPasswordTitle')}
        </span>
      </h2>
      {!hasPassword && <p className="hint">{t('auth.account.setPasswordHint')}</p>}
      <form onSubmit={handleSubmit} className="form" autoComplete="off">
        {errorMsg && (
          <p id="change-pw-error" className="error" role="alert">
            {errorMsg}
          </p>
        )}
        {savedAt != null && !errorMsg && (
          <p className="hint" role="status" aria-live="polite">
            {t(
              hasPassword ? 'auth.account.changePasswordSuccess' : 'auth.account.setPasswordSuccess'
            )}
          </p>
        )}

        {hasPassword && (
          <>
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
          </>
        )}

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
            ? t(
                hasPassword
                  ? 'auth.account.changePasswordSubmitting'
                  : 'auth.account.setPasswordSubmitting'
              )
            : t(
                hasPassword ? 'auth.account.changePasswordSubmit' : 'auth.account.setPasswordSubmit'
              )}
        </button>
      </form>
    </section>
  );
}

function ConnectionsSection({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const availableProviders = useOAuthProviders();
  const [confirmingProvider, setConfirmingProvider] = useState<string | null>(null);

  const unlinkAction = useCallback(
    async (provider: string) => {
      await unlinkOAuthProvider(provider);
      queryClient.setQueryData(queryKeys.auth.me, (prev: UserProfile | null | undefined) =>
        prev
          ? { ...prev, linkedProviders: prev.linkedProviders.filter((p) => p !== provider) }
          : prev
      );
      setConfirmingProvider(null);
    },
    [queryClient]
  );

  const {
    run: runUnlink,
    loading: unlinking,
    error: unlinkError,
  } = useAsyncAction(unlinkAction, t('auth.account.connectionsUnlinkFallbackError'));

  const oauthLinked = params.get('oauthLinked');
  const oauthErrorKey = resolveOAuthErrorKey(params.get('oauthError'));
  const linked = user.linkedProviders;
  const unlinkable = availableProviders.filter((p) => !linked.includes(p));

  if (availableProviders.length === 0 && linked.length === 0) return null;

  return (
    <section className="section section--panel" aria-labelledby="connections-heading">
      <h2 id="connections-heading" className={styles.sectionTitle}>
        <Link2 size={18} aria-hidden />
        <span className={styles.sectionTitleText}>{t('auth.account.connectionsTitle')}</span>
      </h2>
      <p className="hint">{t('auth.account.connectionsDescription')}</p>

      {oauthLinked && (
        <p className="hint" role="status" aria-live="polite">
          {t('auth.account.connectionsLinkedBanner', {
            provider: PROVIDER_LABELS[oauthLinked] ?? oauthLinked,
          })}
        </p>
      )}
      {oauthErrorKey && (
        <p className="error" role="alert">
          {t(oauthErrorKey)}
        </p>
      )}
      {unlinkError && (
        <p className="error" role="alert">
          {unlinkError}
        </p>
      )}

      <ul className={styles.connectionsList}>
        {linked.map((provider) => (
          <li key={provider} className={styles.connectionRow}>
            <span>{PROVIDER_LABELS[provider] ?? provider}</span>
            <span className="muted">{t('auth.account.connectionsLinked')}</span>
            {confirmingProvider === provider ? (
              <div className="nav-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={unlinking}
                  onClick={() => void runUnlink(provider)}
                >
                  {t('common.confirm')}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={unlinking}
                  onClick={() => setConfirmingProvider(null)}
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button type="button" className="btn" onClick={() => setConfirmingProvider(provider)}>
                {t('auth.account.connectionsUnlinkButton')}
              </button>
            )}
          </li>
        ))}
        {unlinkable.map((provider) => (
          <li key={provider} className={styles.connectionRow}>
            <span>{PROVIDER_LABELS[provider] ?? provider}</span>
            <a href={oauthStartUrl(provider, ROUTES.account)} className="btn">
              {t('auth.account.connectionsLinkButton', {
                provider: PROVIDER_LABELS[provider] ?? provider,
              })}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PreferencesSection() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <section className="section section--panel" aria-labelledby="preferences-heading">
      <h2 id="preferences-heading" className={styles.sectionTitle}>
        <Sliders size={18} aria-hidden />
        <span className={styles.sectionTitleText}>{t('auth.account.preferencesTitle')}</span>
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

        {user && (
          <>
            <label className="label" htmlFor="account-rating-scale">
              {t('auth.account.ratingScaleLabel')}
            </label>
            <RatingScaleToggle id="account-rating-scale" />
          </>
        )}
      </div>
    </section>
  );
}

function DataExportSection() {
  const { t } = useTranslation();
  const exportAction = useCallback(() => downloadMyDataExport(), []);
  const {
    run: runExport,
    loading: exporting,
    error: exportError,
  } = useAsyncAction(exportAction, t('auth.account.exportDataError'));

  return (
    <section className="section section--panel" aria-labelledby="export-data-heading">
      <h2 id="export-data-heading" className={styles.sectionTitle}>
        <Download size={18} aria-hidden />
        <span className={styles.sectionTitleText}>{t('auth.account.exportDataTitle')}</span>
      </h2>
      <p className="hint">{t('auth.account.exportDataDescription')}</p>
      {exportError && (
        <p className="error" role="alert">
          {exportError}
        </p>
      )}
      <div className={`nav-actions ${styles.actionRow}`}>
        <button type="button" className="btn" disabled={exporting} onClick={() => void runExport()}>
          {exporting ? t('auth.account.exportDataSubmitting') : t('auth.account.exportDataButton')}
        </button>
      </div>
    </section>
  );
}

function DeleteAccountSection({ hasPassword }: Readonly<{ hasPassword: boolean }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [value, setValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const deleteAction = useCallback(async () => {
    await deleteAccount(hasPassword ? { password: value } : { confirmation: value });
    queryClient.setQueryData(queryKeys.auth.me, null);
    await queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
    navigate(ROUTES.home, { replace: true });
  }, [hasPassword, value, queryClient, navigate]);

  const {
    run: runDelete,
    loading: deleting,
    error: apiError,
    clearError,
  } = useAsyncAction(
    deleteAction,
    t(
      hasPassword
        ? 'auth.account.deleteAccountFallbackError'
        : 'auth.account.deleteAccountConfirmationFallbackError'
    )
  );

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);
    clearError();
    if (!value) {
      setValidationError(
        t(
          hasPassword
            ? 'auth.account.deleteAccountPasswordRequired'
            : 'auth.account.deleteAccountConfirmationRequired'
        )
      );
      return;
    }
    void runDelete();
  };

  const cancel = () => {
    setConfirming(false);
    setValue('');
    setValidationError(null);
    clearError();
  };

  const errorMsg = validationError ?? apiError;

  return (
    <section className="section section--panel" aria-labelledby="danger-zone-heading">
      <h2 id="danger-zone-heading" className={styles.sectionTitle}>
        <AlertCircle size={18} aria-hidden />
        <span className={styles.sectionTitleText}>{t('auth.account.dangerZoneTitle')}</span>
      </h2>
      <p className="hint">{t('auth.account.deleteAccountDescription')}</p>

      {!confirming ? (
        <div className={`nav-actions ${styles.actionRow}`}>
          <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
            {t('auth.account.deleteAccountButton')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={`form ${styles.actionRow}`} autoComplete="off">
          {errorMsg && (
            <p id="delete-account-error" className="error" role="alert">
              {errorMsg}
            </p>
          )}
          <label className="label" htmlFor="delete-account-value">
            {t(
              hasPassword
                ? 'auth.account.deleteAccountPasswordLabel'
                : 'auth.account.deleteAccountConfirmationLabel'
            )}
          </label>
          <input
            id="delete-account-value"
            type={hasPassword ? 'password' : 'text'}
            className="input"
            autoComplete={hasPassword ? 'current-password' : 'off'}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setValidationError(null);
              clearError();
            }}
            aria-describedby={errorMsg ? 'delete-account-error' : undefined}
          />
          <div className="nav-actions">
            <button type="submit" className="btn btn-danger" disabled={deleting}>
              {deleting
                ? t('auth.account.deleteAccountSubmitting')
                : t('auth.account.deleteAccountConfirmButton')}
            </button>
            <button type="button" className="btn" onClick={cancel} disabled={deleting}>
              {t('auth.account.deleteAccountCancel')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function AccountPage() {
  const { t } = useTranslation();
  useDocumentTitle(pageTitle(t('auth.account.title')));
  const { user, isLoading, logout } = useAuth();

  const logoutAction = useCallback(() => logout(), [logout]);
  const {
    run: runLogout,
    loading: loggingOut,
    error: logoutError,
  } = useAsyncAction(logoutAction, t('auth.logout.fallbackError'));

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

  return (
    <PageLayout className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('auth.account.title')}</h1>
        <p className={styles.email}>{user.emailMasked}</p>
      </header>

      <PublicProfileSection />

      <PreferencesSection />

      <NotificationsSection />

      <LetterboxdImportSection />

      <ConnectionsSection user={user} />

      <ChangePasswordSection hasPassword={user.hasPassword} />

      <DataExportSection />

      <section className="section section--panel" aria-labelledby="session-heading">
        <h2 id="session-heading" className={styles.sectionTitle}>
          <LogOut size={18} aria-hidden />
          <span className={styles.sectionTitleText}>{t('auth.account.sessionTitle')}</span>
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

      <DeleteAccountSection hasPassword={user.hasPassword} />
    </PageLayout>
  );
}
