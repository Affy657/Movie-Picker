import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Import, RefreshCw } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import { queryKeys } from '@/shared/hooks/queryKeys';
import {
  previewLetterboxdImport,
  previewLetterboxdImportFromAccount,
  type LetterboxdImportConfirmResult,
  type LetterboxdImportPreview,
} from '@/features/letterboxd/api/letterboxdApi';
import LetterboxdImportReviewModal from './LetterboxdImportReviewModal';
import accountStyles from '@/features/auth/pages/AccountPage.module.css';
import styles from './LetterboxdImportSection.module.css';

const SAVE_FEEDBACK_MS = 2500;

export default function LetterboxdImportSection() {
  const { t } = useTranslation();
  const { user, patchProfile } = useAuth();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const savedTimerRef = useRef<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<LetterboxdImportPreview | null>(null);
  const [importResult, setImportResult] = useState<LetterboxdImportConfirmResult | null>(null);

  useEffect(() => {
    if (!user) return;
    setUsername(user.letterboxdUsername ?? '');
  }, [user]);

  useEffect(() => {
    if (savedAt === null) return;
    globalThis.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = globalThis.setTimeout(() => setSavedAt(null), SAVE_FEEDBACK_MS);
    return () => globalThis.clearTimeout(savedTimerRef.current);
  }, [savedAt]);

  const saveUsernameAction = useCallback(async () => {
    const trimmed = username.trim();
    await patchProfile({ letterboxdUsername: trimmed === '' ? null : trimmed });
    setSavedAt(Date.now());
  }, [patchProfile, username]);

  const {
    run: runSaveUsername,
    loading: savingUsername,
    error: saveUsernameError,
  } = useAsyncAction(saveUsernameAction, t('auth.account.letterboxd.usernameFallbackError'));

  const importAction = useCallback(async (file: File) => {
    const csv = await file.text();
    return previewLetterboxdImport(csv);
  }, []);

  const {
    run: runImport,
    loading: importing,
    error: importError,
    clearError: clearImportError,
  } = useAsyncAction(importAction, t('auth.account.letterboxd.importFallbackError'));

  const {
    run: runAccountImport,
    loading: accountImporting,
    error: accountImportError,
    clearError: clearAccountImportError,
  } = useAsyncAction(
    previewLetterboxdImportFromAccount,
    t('auth.account.letterboxd.accountImportFallbackError')
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    clearImportError();
    clearAccountImportError();
    setImportResult(null);
    const result = await runImport(file);
    if (result) setPreview(result);
    e.target.value = '';
  };

  const handleAccountImport = async () => {
    clearImportError();
    clearAccountImportError();
    setImportResult(null);
    const result = await runAccountImport();
    if (result) setPreview(result);
  };

  const handleImported = (result: LetterboxdImportConfirmResult) => {
    setPreview(null);
    setImportResult(result);
    void queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.list });
  };

  if (!user) return null;

  return (
    <section className="section section--panel" aria-labelledby="letterboxd-heading">
      <h2 id="letterboxd-heading" className={accountStyles.sectionTitle}>
        <Import size={18} aria-hidden />
        {t('auth.account.letterboxd.title')}
      </h2>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>
          <RefreshCw size={15} aria-hidden />
          {t('auth.account.letterboxd.syncTitle')}
        </h3>
        <p className={styles.blockDescription}>{t('auth.account.letterboxd.syncDescription')}</p>

        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            void runSaveUsername();
          }}
        >
          {saveUsernameError && (
            <p className="error" role="alert">
              {saveUsernameError}
            </p>
          )}
          {savedAt !== null && !saveUsernameError && (
            <p className="hint" role="status" aria-live="polite">
              {t('auth.account.saveSuccess')}
            </p>
          )}

          <label className="label" htmlFor="letterboxd-username">
            {t('auth.account.letterboxd.usernameLabel')}
          </label>
          <input
            id="letterboxd-username"
            type="text"
            className="input"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setSavedAt(null);
            }}
            placeholder={t('auth.account.letterboxd.usernamePlaceholder')}
            maxLength={40}
          />
          <p className="hint">{t('auth.account.letterboxd.usernameHint')}</p>

          <button type="submit" className="btn btn-primary" disabled={savingUsername}>
            {savingUsername ? t('auth.account.saving') : t('common.save')}
          </button>
        </form>
      </div>

      {importResult && !importError && !accountImportError && (
        <p className="hint" role="status" aria-live="polite">
          {importResult.added > 0
            ? t('auth.account.letterboxd.importSuccess', {
                added: String(importResult.added),
                alreadyPresent: String(importResult.alreadyPresent),
              })
            : t('auth.account.letterboxd.importSuccessNoneAdded')}
        </p>
      )}

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>
          <Download size={15} aria-hidden />
          {t('auth.account.letterboxd.accountImportTitle')}
        </h3>
        <p className={styles.blockDescription}>
          {t('auth.account.letterboxd.accountImportDescription')}
        </p>

        {accountImportError && (
          <p className="error" role="alert">
            {accountImportError}
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleAccountImport()}
          disabled={accountImporting || !user.letterboxdUsername}
        >
          {accountImporting
            ? t('auth.account.letterboxd.accountImportSubmitting')
            : t('auth.account.letterboxd.accountImportSubmit')}
        </button>
        <p className="hint">
          {user.letterboxdUsername
            ? t('auth.account.letterboxd.accountImportHint')
            : t('auth.account.letterboxd.accountImportNeedsUsername')}
        </p>
      </div>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>
          <Import size={15} aria-hidden />
          {t('auth.account.letterboxd.importTitle')}
        </h3>
        <p className={styles.blockDescription}>{t('auth.account.letterboxd.importDescription')}</p>

        {importError && (
          <p className="error" role="alert">
            {importError}
          </p>
        )}

        <div className={styles.fileDropZone}>
          <input
            ref={fileInputRef}
            id="letterboxd-csv"
            type="file"
            accept=".csv,text/csv"
            className="visually-hidden"
            onChange={(e) => void handleFileChange(e)}
            disabled={importing}
          />
          <label
            htmlFor="letterboxd-csv"
            className={styles.fileDropLabel}
            aria-label={t('auth.account.letterboxd.csvLabel')}
          >
            <Import size={22} aria-hidden className={styles.fileDropIcon} />
            <span className={styles.fileDropText}>
              <span className={styles.fileDropTitle}>{t('auth.account.letterboxd.csvLabel')}</span>
              <span className={styles.fileDropHint}>
                {t('auth.account.letterboxd.csvDropHint')}
              </span>
            </span>
          </label>
        </div>
        <p className="hint">{t('auth.account.letterboxd.csvHint')}</p>
        {importing && <p className="placeholder">{t('common.loading')}</p>}
      </div>

      {preview && (
        <LetterboxdImportReviewModal
          open
          preview={preview}
          onClose={() => setPreview(null)}
          onImported={handleImported}
        />
      )}
    </section>
  );
}
