import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Download, KeyRound, LogOut, Mail, Trash2 } from 'lucide-react';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { ROUTES } from '@/app/routes';
import {
  deleteAccount,
  downloadMyDataExport,
  patchChangePassword,
} from '@/features/auth/api/authApi';
import type { UserProfile } from '@/features/auth/types';
import { isRegisterPasswordCompliant } from '@/shared/utils/authPasswordRules';
import sharedStyles from './AccountShared.module.css';

const PROVIDER_LABELS: Record<string, string> = { google: 'Google', github: 'GitHub' };
const POST_PASSWORD_CHANGE_REDIRECT_MS = 4000;

function passwordSubmitLabel(
  changing: boolean,
  hasPassword: boolean,
  t: (key: TranslationKey) => string
): string {
  if (changing) {
    return t(
      hasPassword ? 'auth.account.changePasswordSubmitting' : 'auth.account.setPasswordSubmitting'
    );
  }
  return t(hasPassword ? 'auth.account.changePasswordSubmit' : 'auth.account.setPasswordSubmit');
}

function PasswordRow({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const redirectTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => globalThis.clearTimeout(redirectTimerRef.current), []);

  const changeAction = useCallback(async () => {
    await patchChangePassword(user.hasPassword ? currentPassword : '', newPassword);
    setSucceeded(true);
    globalThis.clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = globalThis.setTimeout(() => {
      queryClient.setQueryData(queryKeys.auth.me, null);
      navigate(ROUTES.login, { replace: true });
    }, POST_PASSWORD_CHANGE_REDIRECT_MS);
  }, [user.hasPassword, currentPassword, newPassword, queryClient, navigate]);

  const {
    run: runChange,
    loading: changing,
    error: apiError,
    clearError,
  } = useAsyncAction(
    changeAction,
    t(
      user.hasPassword
        ? 'auth.account.changePasswordFallbackError'
        : 'auth.account.setPasswordFallbackError'
    )
  );

  const cancel = () => {
    setExpanded(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setValidationError(null);
    clearError();
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

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
  const firstProvider = user.linkedProviders[0];

  if (succeeded) {
    return (
      <div className={sharedStyles.row}>
        <KeyRound size={19} aria-hidden className={sharedStyles.rowIcon} />
        <div className={sharedStyles.rowMain}>
          <p className={sharedStyles.rowLabel}>{t('auth.account.passwordRowLabel')}</p>
          <p className={sharedStyles.rowSub} role="status" aria-live="polite">
            {t(
              user.hasPassword
                ? 'auth.account.changePasswordSuccess'
                : 'auth.account.setPasswordSuccess'
            )}
          </p>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className={sharedStyles.row}>
        <KeyRound size={19} aria-hidden className={sharedStyles.rowIcon} />
        <div className={sharedStyles.rowMain}>
          <p className={sharedStyles.rowLabel}>{t('auth.account.passwordRowLabel')}</p>
          <p className={sharedStyles.rowSub}>
            {user.hasPassword
              ? t('auth.account.passwordSetHint')
              : t('auth.account.passwordNotSetHint', {
                  provider: PROVIDER_LABELS[firstProvider ?? ''] ?? firstProvider ?? '',
                })}
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setExpanded(true)}>
          {t(
            user.hasPassword
              ? 'auth.account.changePasswordRowButton'
              : 'auth.account.setPasswordRowButton'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={sharedStyles.field}>
      <form onSubmit={handleSubmit} className="form" autoComplete="off">
        {errorMsg && (
          <p id="change-pw-error" className="error" role="alert">
            {errorMsg}
          </p>
        )}

        {user.hasPassword && (
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

        <p className="hint">{t('auth.account.passwordChangeLogoutWarning')}</p>

        <div className="nav-actions">
          <button type="submit" className="btn btn-primary" disabled={changing}>
            {passwordSubmitLabel(changing, user.hasPassword, t)}
          </button>
          <button type="button" className="btn" onClick={cancel} disabled={changing}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}

function DataExportRow() {
  const { t } = useTranslation();
  const exportAction = useCallback(() => downloadMyDataExport(), []);
  const {
    run: runExport,
    loading: exporting,
    error: exportError,
  } = useAsyncAction(exportAction, t('auth.account.exportDataError'));

  return (
    <div className={sharedStyles.row}>
      <Download size={19} aria-hidden className={sharedStyles.rowIcon} />
      <div className={sharedStyles.rowMain}>
        <p className={sharedStyles.rowLabel}>{t('auth.account.exportDataTitle')}</p>
        <p className={sharedStyles.rowSub}>{t('auth.account.exportDataDescription')}</p>
        {exportError && (
          <p className="error" role="alert">
            {exportError}
          </p>
        )}
      </div>
      <button type="button" className="btn" disabled={exporting} onClick={() => void runExport()}>
        {exporting ? t('auth.account.exportDataSubmitting') : t('auth.account.exportDataButton')}
      </button>
    </div>
  );
}

function LogoutRow() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const logoutAction = useCallback(() => logout(), [logout]);
  const {
    run: runLogout,
    loading: loggingOut,
    error: logoutError,
  } = useAsyncAction(logoutAction, t('auth.logout.fallbackError'));

  return (
    <div className={sharedStyles.row}>
      <LogOut size={19} aria-hidden className={sharedStyles.rowIcon} />
      <div className={sharedStyles.rowMain}>
        <p className={sharedStyles.rowLabel}>{t('auth.account.sessionRowLabel')}</p>
        <p className={sharedStyles.rowSub}>{t('auth.account.sessionRowHint')}</p>
        {logoutError && (
          <p className="error" role="alert">
            {logoutError}
          </p>
        )}
      </div>
      <button type="button" className="btn" disabled={loggingOut} onClick={() => void runLogout()}>
        {loggingOut ? t('auth.logout.submitting') : t('auth.account.logoutButton')}
      </button>
    </div>
  );
}

function DeleteAccountZone({ hasPassword }: Readonly<{ hasPassword: boolean }>) {
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
    navigate(ROUTES.discover, { replace: true });
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
    <div className={sharedStyles.dangerZone}>
      <p className={sharedStyles.cardTitle}>
        <Trash2 size={14} aria-hidden />
        <span>{t('auth.account.deleteAccountSectionTitle')}</span>
      </p>
      <p>{t('auth.account.deleteAccountDescription')}</p>

      {!confirming ? (
        <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
          {t('auth.account.deleteAccountButton')}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="form" autoComplete="off">
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
    </div>
  );
}

export default function AccountSecurityPage({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();

  return (
    <>
      <div className={sharedStyles.panelHead}>
        <h2 id="account-security-heading" className={sharedStyles.panelHeading}>
          {t('auth.account.securityTitle')}
        </h2>
      </div>

      <div className={sharedStyles.card}>
        <div className={sharedStyles.row}>
          <Mail size={19} aria-hidden className={sharedStyles.rowIcon} />
          <div className={sharedStyles.rowMain}>
            <p className={sharedStyles.rowLabel}>{t('auth.account.emailLabel')}</p>
            <p className={sharedStyles.rowSub}>{user.email ?? user.emailMasked}</p>
          </div>
        </div>

        <PasswordRow user={user} />
        <DataExportRow />
        <LogoutRow />
      </div>

      <DeleteAccountZone hasPassword={user.hasPassword} />
    </>
  );
}
