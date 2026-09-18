import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { AlertTriangle, Check, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import { API_ERROR_REASONS } from '@/shared/api/apiError';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { invalidateWatchlist } from '@/features/movies/hooks/useWatchlist';
import InfoBubble from '@/shared/components/InfoBubble';
import {
  syncLetterboxd,
  type LetterboxdConfirmResult,
  type LetterboxdPendingChoice,
  type LetterboxdSyncReport,
} from '@/features/letterboxd/api/letterboxdApi';
import type { UserProfile } from '@/features/auth/types';
import LetterboxdChoicesModal from './LetterboxdChoicesModal';
import sharedStyles from '@/shared/components/SettingsSection.module.css';
import styles from './LetterboxdImportSection.module.css';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';

function formatSyncDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

function translateStoredSyncError(
  stored: string | null,
  t: ReturnType<typeof useTranslation>['t']
): string | null {
  if (stored === API_ERROR_REASONS.letterboxdWatchlistIncomplete) {
    return t('apiErrors.letterboxd_watchlist_incomplete');
  }
  return stored;
}

export default function LetterboxdImportSection() {
  const { t, locale } = useTranslation();
  const { user, patchProfile } = useAuth();
  const queryClient = useQueryClient();

  const savedUsername = user?.letterboxdUsername ?? null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [report, setReport] = useState<LetterboxdSyncReport | null>(null);
  const [choicesOpen, setChoicesOpen] = useState(false);
  const [confirmResult, setConfirmResult] = useState<LetterboxdConfirmResult | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEditing = () => {
    setDraft(savedUsername ?? '');
    setEditing(true);
  };

  const saveUsernameAction = useCallback(async () => {
    const trimmed = draft.trim();
    await patchProfile({ letterboxdUsername: trimmed });
    setEditing(false);
    setReport(null);
    setConfirmResult(null);
  }, [draft, patchProfile]);

  const {
    run: runSaveUsername,
    loading: savingUsername,
    error: saveUsernameError,
    clearError: clearSaveError,
  } = useAsyncAction(saveUsernameAction, t('auth.account.letterboxd.usernameFallbackError'));

  const disconnectAction = useCallback(async () => {
    await patchProfile({ letterboxdUsername: '' });
    setReport(null);
    setConfirmResult(null);
  }, [patchProfile]);

  const {
    run: runDisconnect,
    loading: disconnecting,
    error: disconnectError,
  } = useAsyncAction(
    disconnectAction,
    t('auth.account.letterboxd.usernameDisconnectFallbackError')
  );

  const syncAction = useCallback(async () => {
    const result = await syncLetterboxd(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    void invalidateWatchlist(queryClient);
    return result;
  }, [queryClient]);

  const {
    run: runSync,
    loading: syncing,
    error: syncError,
    clearError: clearSyncError,
  } = useAsyncAction(syncAction, t('auth.account.letterboxd.syncFallbackError'));

  const handleSync = async () => {
    clearSyncError();
    setConfirmResult(null);
    setReport(null);
    const result = await runSync();
    if (!result) return;
    setReport(result);
    setChoicesOpen(result.pendingChoices.length > 0);
  };

  const handleConfirmed = (
    result: LetterboxdConfirmResult,
    unresolved: LetterboxdPendingChoice[]
  ) => {
    setChoicesOpen(false);
    setReport((prev) => (prev ? { ...prev, pendingChoices: unresolved } : prev));
    setConfirmResult(result);
    queryClient.setQueryData(queryKeys.auth.me, (prev: UserProfile | null | undefined) =>
      prev
        ? {
            ...prev,
            letterboxdPendingReconciliationCount: result.pendingReconciliationCount,
          }
        : prev
    );
    void invalidateWatchlist(queryClient);
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  };

  if (!user) return null;

  const connected = Boolean(savedUsername);
  const lastSyncError = translateStoredSyncError(user.letterboxdLastSyncError, t);
  const lastSyncAt = user.letterboxdLastSyncAt;
  const showInput = editing || !connected;

  return (
    <div className={sharedStyles.card}>
      <p className={sharedStyles.cardTitle}>
        <span>{t('auth.account.letterboxd.title')}</span>
        <InfoBubble label={t('auth.account.letterboxd.helpTitle')}>
          <p>{t('auth.account.letterboxd.helpSync')}</p>
          <p>{t('auth.account.letterboxd.helpSafety')}</p>
          <p>{t('auth.account.letterboxd.helpUsername')}</p>
        </InfoBubble>
      </p>

      <div className={clsx(sharedStyles.field, sharedStyles.noDivider)}>
        {showInput ? (
          <form
            className={styles.editRow}
            onSubmit={(e) => {
              e.preventDefault();
              void runSaveUsername();
            }}
          >
            <label className="visually-hidden" htmlFor="letterboxd-username">
              {t('auth.account.letterboxd.usernameLabel')}
            </label>
            <input
              ref={inputRef}
              id="letterboxd-username"
              type="text"
              className={clsx('input', styles.usernameInput)}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                clearSaveError();
              }}
              placeholder={t('auth.account.letterboxd.usernamePlaceholder')}
              maxLength={40}
            />
            <IconButton
              type="submit"
              size="lg"
              loading={savingUsername}
              ariaLabel={t('auth.account.letterboxd.usernameSave')}
            >
              <Check size={ICON_SIZE.lg} aria-hidden />
            </IconButton>
            {connected && (
              <IconButton
                size="lg"
                onClick={() => {
                  clearSaveError();
                  setEditing(false);
                }}
                ariaLabel={t('common.cancel')}
              >
                <X size={ICON_SIZE.lg} aria-hidden />
              </IconButton>
            )}
          </form>
        ) : (
          <div className={styles.connectionRow}>
            <span className={styles.usernameValue}>{savedUsername}</span>
            <div className={styles.connectionActions}>
              <Button type="button" className={sharedStyles.smallBtn} onClick={startEditing}>
                {t('auth.account.letterboxd.usernameEdit')}
              </Button>
              <Button
                type="button"
                tone="danger"
                className={sharedStyles.smallBtn}
                onClick={() => void runDisconnect()}
                disabled={disconnecting}
              >
                {t('auth.account.letterboxd.usernameDisconnect')}
              </Button>
            </div>
          </div>
        )}

        {!connected && <p className={styles.status}>{t('auth.account.letterboxd.statusOff')}</p>}

        {connected && lastSyncError && (
          <p className={styles.statusError} role="alert">
            <AlertTriangle size={ICON_SIZE.sm} aria-hidden />
            <span className={styles.statusLabel}>{lastSyncError}</span>
          </p>
        )}

        {connected && !lastSyncError && (
          <p className={styles.statusOk}>
            <Check size={ICON_SIZE.sm} aria-hidden />
            <span className={styles.statusLabel}>
              {lastSyncAt
                ? t('auth.account.letterboxd.statusSyncedAt', {
                    date: formatSyncDate(lastSyncAt, locale),
                  })
                : t('auth.account.letterboxd.statusPending')}
            </span>
          </p>
        )}
      </div>

      {connected && !report && !confirmResult && user.letterboxdPendingReconciliationCount > 0 && (
        <output className={sharedStyles.attention}>
          <TriangleAlert size={ICON_SIZE.md} aria-hidden />
          <span className={sharedStyles.attentionText}>
            {pluralizeCount(
              user.letterboxdPendingReconciliationCount,
              'auth.account.letterboxd.attentionMessageOne',
              'auth.account.letterboxd.attentionMessage',
              t
            )}
          </span>
          <Button
            type="button"
            className={sharedStyles.attentionBtn}
            onClick={() => void handleSync()}
            disabled={syncing}
          >
            {t('auth.account.letterboxd.attentionConfirm')}
          </Button>
        </output>
      )}

      {saveUsernameError && (
        <p className="error" role="alert">
          {saveUsernameError}
        </p>
      )}

      {disconnectError && (
        <p className="error" role="alert">
          {disconnectError}
        </p>
      )}

      {connected && (
        <div className={sharedStyles.row}>
          <div className={sharedStyles.rowMain}>
            <p className={clsx(sharedStyles.rowSub, sharedStyles.rowSubFlush)}>
              {t('auth.account.letterboxd.syncPersistentHint')}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            className={styles.syncBtn}
            onClick={() => void handleSync()}
            disabled={syncing}
          >
            <RefreshCw size={ICON_SIZE.md} aria-hidden />
            <span>
              {syncing
                ? t('auth.account.letterboxd.syncSubmitting')
                : t('auth.account.letterboxd.syncNow')}
            </span>
          </Button>
        </div>
      )}

      {syncError && (
        <p className="error" role="alert">
          {syncError}
        </p>
      )}

      {report && !syncError && (
        <div className={styles.report} role="status" aria-live="polite">
          <span className={styles.reportRow}>
            <span className={styles.reportIconOk}>
              <Check size={ICON_SIZE.sm} aria-hidden />
            </span>
            <span>
              {t('auth.account.letterboxd.reportChanges', {
                added: String(report.added),
                removed: String(report.removed),
              })}
            </span>
          </span>

          {report.pendingChoices.length > 0 && (
            <button
              type="button"
              className={styles.reportAction}
              onClick={() => setChoicesOpen(true)}
            >
              {t('auth.account.letterboxd.reportPending', {
                count: String(report.pendingChoices.length),
              })}
            </button>
          )}

          {report.unmatchedTitles.length > 0 && (
            <details className={styles.unmatched}>
              <summary>
                {t('auth.account.letterboxd.reportUnmatched', {
                  count: String(report.unmatchedTitles.length),
                })}
              </summary>
              <ul className={styles.unmatchedList}>
                {report.unmatchedTitles.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </details>
          )}

          {report.totalTruncated > 0 && (
            <p className={styles.reportLine}>
              {t('auth.account.letterboxd.reportTruncated', {
                count: String(report.totalTruncated),
              })}
            </p>
          )}
        </div>
      )}

      {confirmResult && (
        <p className="hint" role="status" aria-live="polite">
          {t('auth.account.letterboxd.choicesApplied', { added: String(confirmResult.added) })}
        </p>
      )}

      {choicesOpen && report && report.pendingChoices.length > 0 && (
        <LetterboxdChoicesModal
          open
          choices={report.pendingChoices}
          onClose={() => setChoicesOpen(false)}
          onConfirmed={handleConfirmed}
        />
      )}
    </div>
  );
}
