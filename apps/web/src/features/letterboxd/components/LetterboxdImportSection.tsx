import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Pencil, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import { queryKeys } from '@/shared/hooks/queryKeys';
import InfoBubble from '@/shared/components/InfoBubble';
import {
  syncLetterboxd,
  type LetterboxdConfirmResult,
  type LetterboxdSyncReport,
} from '@/features/letterboxd/api/letterboxdApi';
import LetterboxdChoicesModal from './LetterboxdChoicesModal';
import accountStyles from '@/features/auth/pages/AccountPage.module.css';
import styles from './LetterboxdImportSection.module.css';

function formatSyncDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
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
    await patchProfile({ letterboxdUsername: trimmed === '' ? null : trimmed });
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

  const syncAction = useCallback(async () => {
    const result = await syncLetterboxd(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    void queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.list });
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

  const handleConfirmed = (result: LetterboxdConfirmResult) => {
    setChoicesOpen(false);
    setReport(null);
    setConfirmResult(result);
    void queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.list });
  };

  if (!user) return null;

  const connected = Boolean(savedUsername);
  const lastSyncError = user.letterboxdLastSyncError;
  const lastSyncAt = user.letterboxdLastSyncAt;
  const showInput = editing || !connected;

  return (
    <section className="section section--panel" aria-labelledby="letterboxd-heading">
      <h2 id="letterboxd-heading" className={accountStyles.sectionTitle}>
        <RefreshCw size={18} aria-hidden />
        {t('auth.account.letterboxd.title')}
        <InfoBubble label={t('auth.account.letterboxd.helpTitle')}>
          <p>{t('auth.account.letterboxd.helpSync')}</p>
          <p>{t('auth.account.letterboxd.helpSafety')}</p>
          <p>{t('auth.account.letterboxd.helpUsername')}</p>
        </InfoBubble>
      </h2>

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
            className="input"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              clearSaveError();
            }}
            placeholder={t('auth.account.letterboxd.usernamePlaceholder')}
            maxLength={40}
          />
          <button
            type="submit"
            className={styles.iconBtn}
            disabled={savingUsername}
            aria-label={t('auth.account.letterboxd.usernameSave')}
          >
            <Check size={16} aria-hidden />
          </button>
          {connected && (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => {
                clearSaveError();
                setEditing(false);
              }}
              aria-label={t('common.cancel')}
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </form>
      ) : (
        <p className={styles.usernameRow}>
          <span className={styles.usernameValue}>{savedUsername}</span>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={startEditing}
            aria-label={t('auth.account.letterboxd.usernameEdit')}
          >
            <Pencil size={14} aria-hidden />
          </button>
        </p>
      )}

      {saveUsernameError && (
        <p className="error" role="alert">
          {saveUsernameError}
        </p>
      )}

      {!connected && <p className={styles.status}>{t('auth.account.letterboxd.statusOff')}</p>}

      {connected && lastSyncError && (
        <p className={styles.statusError} role="alert">
          <AlertTriangle size={14} aria-hidden />
          {lastSyncError}
        </p>
      )}

      {connected && !lastSyncError && (
        <p className={styles.statusOk}>
          <Check size={14} aria-hidden />
          {lastSyncAt
            ? t('auth.account.letterboxd.statusSyncedAt', {
                date: formatSyncDate(lastSyncAt, locale),
              })
            : t('auth.account.letterboxd.statusPending')}
        </p>
      )}

      <button
        type="button"
        className={styles.syncBtn}
        onClick={() => void handleSync()}
        disabled={syncing || !connected}
      >
        <RefreshCw size={15} aria-hidden />
        {syncing
          ? t('auth.account.letterboxd.syncSubmitting')
          : t('auth.account.letterboxd.syncNow')}
      </button>

      {syncError && (
        <p className="error" role="alert">
          {syncError}
        </p>
      )}

      {report && !syncError && (
        <div className={styles.report} role="status" aria-live="polite">
          <p className={styles.reportLine}>
            {t('auth.account.letterboxd.reportChanges', {
              added: String(report.added),
              removed: String(report.removed),
            })}
          </p>

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
    </section>
  );
}
