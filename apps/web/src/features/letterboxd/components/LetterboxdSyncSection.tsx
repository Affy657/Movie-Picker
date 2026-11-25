import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  AlertTriangle,
  AtSign,
  Bookmark,
  Check,
  Eye,
  RefreshCw,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useTranslation, type Translate, type TranslationKey } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { invalidateWatchlist } from '@/features/movies/hooks/useWatchlist';
import { invalidateWatched } from '@/features/movies/hooks/invalidateWatched';
import InfoBubble from '@/shared/components/InfoBubble';
import Toggle from '@/shared/components/Toggle';
import {
  syncLetterboxd,
  type LetterboxdConfirmResult,
  type LetterboxdPendingChoice,
  type LetterboxdSyncReport,
} from '@/features/letterboxd/api/letterboxdApi';
import { useLetterboxdSyncTargets } from '@/features/letterboxd/hooks/useLetterboxdSyncTargets';
import {
  listChanged,
  listChangesText,
  listTruncatedText,
  pendingChoicesOf,
  reportedLists,
  syncErrorMessage,
  syncMeasureOf,
  truncatedLists,
  unmatchedTitlesOf,
} from '@/features/letterboxd/utils/syncReport';
import type { UserProfile } from '@/features/auth/types';
import { letterboxdSyncEnabled } from '@/features/letterboxd/utils/letterboxdSync';
import LetterboxdChoicesModal from './LetterboxdChoicesModal';
import sharedStyles from '@/shared/components/SettingsSection.module.css';
import styles from './LetterboxdSyncSection.module.css';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import LinkButton from '@/shared/components/LinkButton';

function formatSyncDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

type SkippedReason = 'deferred' | 'bothOff';

const SKIPPED_MESSAGE_KEYS: Record<SkippedReason, TranslationKey> = {
  deferred: 'auth.account.letterboxd.syncDeferred',
  bothOff: 'auth.account.letterboxd.syncBothOff',
};

function countedDescription(
  count: number,
  keys: { none: TranslationKey; one: TranslationKey; many: TranslationKey },
  t: Translate
): string {
  if (count === 0) return t(keys.none);
  return pluralizeCount(count, keys.one, keys.many, t);
}

function SyncTargetRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: Readonly<{
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}>) {
  const titleId = useId();
  return (
    <div className={sharedStyles.row}>
      <Icon size={ICON_SIZE.xl} aria-hidden className={sharedStyles.rowIcon} />
      <div className={sharedStyles.rowMain}>
        <p id={titleId} className={sharedStyles.rowLabel}>
          {title}
        </p>
        <p className={sharedStyles.rowSub}>{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} ariaLabelledBy={titleId} />
    </div>
  );
}

function SyncTargets({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();
  const targets = useLetterboxdSyncTargets();
  return (
    <>
      <SyncTargetRow
        icon={Bookmark}
        title={t('watchlist.title')}
        description={countedDescription(
          user.letterboxdWatchlistCount ?? 0,
          {
            none: 'auth.account.letterboxd.syncWatchlistDescriptionNone',
            one: 'auth.account.letterboxd.syncWatchlistDescriptionOne',
            many: 'auth.account.letterboxd.syncWatchlistDescription',
          },
          t
        )}
        checked={targets.watchlist}
        onChange={(checked) => targets.change('watchlist', checked)}
      />
      <SyncTargetRow
        icon={Eye}
        title={t('watched.title')}
        description={countedDescription(
          user.letterboxdWatchedCount ?? 0,
          {
            none: 'auth.account.letterboxd.syncWatchedDescriptionNone',
            one: 'auth.account.letterboxd.syncWatchedDescriptionOne',
            many: 'auth.account.letterboxd.syncWatchedDescription',
          },
          t
        )}
        checked={targets.watched}
        onChange={(checked) => targets.change('watched', checked)}
      />
      {targets.error && (
        <p className={clsx(styles.errorLine, styles.trailingBlock)} role="alert">
          {targets.error}
        </p>
      )}
    </>
  );
}

function AccountStatus({
  connected,
  lastSyncError,
  lastSyncAt,
}: Readonly<{ connected: boolean; lastSyncError: string | null; lastSyncAt: string | null }>) {
  const { t, locale } = useTranslation();
  if (!connected) return <p className={styles.status}>{t('auth.account.letterboxd.statusOff')}</p>;
  if (lastSyncError) {
    return (
      <p className={styles.statusError} role="alert">
        <AlertTriangle size={ICON_SIZE.sm} aria-hidden />
        <span className={styles.statusLabel}>{lastSyncError}</span>
      </p>
    );
  }
  return (
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
  );
}

function ReportChangesRow({ text }: Readonly<{ text: string }>) {
  return (
    <span className={styles.reportRow}>
      <span className={styles.reportIconOk}>
        <Check size={ICON_SIZE.sm} aria-hidden />
      </span>
      <span>{text}</span>
    </span>
  );
}

function SyncReportCard({
  report,
  pendingCount,
  onOpenChoices,
}: Readonly<{
  report: LetterboxdSyncReport;
  pendingCount: number;
  onOpenChoices: () => void;
}>) {
  const { t } = useTranslation();
  const unmatchedTitles = unmatchedTitlesOf(report);

  return (
    <Card
      padding="none"
      surface="sunken"
      className={clsx(styles.report, styles.trailingBlock)}
      role="status"
      aria-live="polite"
    >
      {reportedLists(report).map((list) => (
        <ReportChangesRow key={list.target} text={listChangesText(list, t)} />
      ))}

      {pendingCount > 0 && (
        <LinkButton size="sm" className={styles.reportAction} onClick={onOpenChoices}>
          {t('auth.account.letterboxd.reportPending', { count: String(pendingCount) })}
        </LinkButton>
      )}

      {unmatchedTitles.length > 0 && (
        <details className={styles.unmatched}>
          <summary>
            {t('auth.account.letterboxd.reportUnmatched', {
              count: String(unmatchedTitles.length),
            })}
          </summary>
          <ul className={styles.unmatchedList}>
            {unmatchedTitles.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </details>
      )}

      {truncatedLists(report).map((list) => (
        <p key={list.target} className={styles.reportLine}>
          {listTruncatedText(list, t)}
        </p>
      ))}
    </Card>
  );
}

function confirmedMessage(result: LetterboxdConfirmResult, t: Translate): string {
  if (result.watchedAdded === 0) {
    return t('auth.account.letterboxd.choicesApplied', { added: String(result.added) });
  }
  return t('auth.account.letterboxd.choicesAppliedWithWatched', {
    added: String(result.added),
    watched: String(result.watchedAdded),
  });
}

export default function LetterboxdSyncSection() {
  const { t } = useTranslation();
  const { user, patchProfile } = useAuth();
  const { track } = useAnalytics();
  const queryClient = useQueryClient();

  const savedUsername = user?.letterboxdUsername ?? null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [report, setReport] = useState<LetterboxdSyncReport | null>(null);
  const [pendingChoices, setPendingChoices] = useState<LetterboxdPendingChoice[]>([]);
  const [choicesOpen, setChoicesOpen] = useState(false);
  const [confirmResult, setConfirmResult] = useState<LetterboxdConfirmResult | null>(null);
  const [skippedReason, setSkippedReason] = useState<SkippedReason | null>(null);

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
    track('letterboxd_disconnected');
    setReport(null);
    setConfirmResult(null);
  }, [patchProfile, track]);

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
    if (listChanged(result, 'watched')) void invalidateWatched(queryClient);
    else void invalidateWatchlist(queryClient);
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
    setSkippedReason(null);
    const bothOff =
      !letterboxdSyncEnabled(user, 'watchlist') && !letterboxdSyncEnabled(user, 'watched');
    const result = await runSync();
    if (!result) return;
    if (result.skipped) {
      setSkippedReason(bothOff ? 'bothOff' : 'deferred');
      return;
    }
    track('letterboxd_synced', { mode: 'manual', ...syncMeasureOf(result) });
    const pending = pendingChoicesOf(result);
    setReport(result);
    setPendingChoices(pending);
    setChoicesOpen(pending.length > 0);
  };

  const handleConfirmed = (
    result: LetterboxdConfirmResult,
    unresolved: LetterboxdPendingChoice[]
  ) => {
    setChoicesOpen(false);
    setPendingChoices(unresolved);
    setConfirmResult(result);
    queryClient.setQueryData(queryKeys.auth.me, (prev: UserProfile | null | undefined) =>
      prev
        ? {
            ...prev,
            letterboxdPendingReconciliationCount: result.pendingReconciliationCount,
          }
        : prev
    );
    if (result.watchedAdded > 0) void invalidateWatched(queryClient);
    else void invalidateWatchlist(queryClient);
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  };

  if (!user) return null;

  const connected = Boolean(savedUsername);
  const lastSyncError = syncErrorMessage(report ? report.error : user.letterboxdLastSyncError, t);
  const lastSyncAt = user.letterboxdLastSyncAt;
  const showInput = editing || !connected;

  return (
    <Card padding="none" elevation="sm" className={sharedStyles.card}>
      <p className={sharedStyles.cardTitle}>
        <span>{t('auth.account.letterboxd.title')}</span>
        <InfoBubble label={t('auth.account.letterboxd.helpTitle')}>
          <p>{t('auth.account.letterboxd.helpSync')}</p>
          <p>{t('auth.account.letterboxd.helpSafety')}</p>
          <p>{t('auth.account.letterboxd.helpUsername')}</p>
        </InfoBubble>
      </p>

      <div className={clsx(sharedStyles.row, sharedStyles.noDivider)}>
        <AtSign size={ICON_SIZE.xl} aria-hidden className={sharedStyles.rowIcon} />
        <div className={sharedStyles.rowMain}>
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
            <p className={clsx(sharedStyles.rowLabel, styles.usernameValue)}>{savedUsername}</p>
          )}
          <AccountStatus
            connected={connected}
            lastSyncError={lastSyncError}
            lastSyncAt={lastSyncAt}
          />
          {saveUsernameError && (
            <p className={styles.errorLine} role="alert">
              {saveUsernameError}
            </p>
          )}
          {disconnectError && (
            <p className={styles.errorLine} role="alert">
              {disconnectError}
            </p>
          )}
        </div>
        {!showInput && (
          <div className={styles.connectionActions}>
            <Button type="button" onClick={startEditing}>
              {t('auth.account.letterboxd.usernameEdit')}
            </Button>
            <Button
              type="button"
              tone="danger"
              onClick={() => void runDisconnect()}
              disabled={disconnecting}
            >
              {t('auth.account.letterboxd.usernameDisconnect')}
            </Button>
          </div>
        )}
      </div>

      {connected && <SyncTargets user={user} />}

      {connected && (
        <div className={sharedStyles.row}>
          <RefreshCw size={ICON_SIZE.xl} aria-hidden className={sharedStyles.rowIcon} />
          <div className={sharedStyles.rowMain}>
            <p className={sharedStyles.rowLabel}>{t('auth.account.letterboxd.syncRowLabel')}</p>
            <p className={sharedStyles.rowSub}>{t('auth.account.letterboxd.syncPersistentHint')}</p>
            {syncError && (
              <p className={styles.errorLine} role="alert">
                {syncError}
              </p>
            )}
            {skippedReason && (
              <p className={sharedStyles.rowSub} role="status" aria-live="polite">
                {t(SKIPPED_MESSAGE_KEYS[skippedReason])}
              </p>
            )}
            {confirmResult && (
              <p className={sharedStyles.rowSub} role="status" aria-live="polite">
                {confirmedMessage(confirmResult, t)}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleSync()}
            disabled={syncing}
          >
            {syncing
              ? t('auth.account.letterboxd.syncSubmitting')
              : t('auth.account.letterboxd.syncNow')}
          </Button>
        </div>
      )}

      {connected && !report && !confirmResult && user.letterboxdPendingReconciliationCount > 0 && (
        <output className={clsx(sharedStyles.attention, styles.trailingBlock)}>
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
            size="sm"
            tone="warning"
            onClick={() => void handleSync()}
            disabled={syncing}
          >
            {t('auth.account.letterboxd.attentionConfirm')}
          </Button>
        </output>
      )}

      {report && !syncError && (
        <SyncReportCard
          report={report}
          pendingCount={pendingChoices.length}
          onOpenChoices={() => setChoicesOpen(true)}
        />
      )}

      {choicesOpen && pendingChoices.length > 0 && (
        <LetterboxdChoicesModal
          open
          choices={pendingChoices}
          onClose={() => setChoicesOpen(false)}
          onConfirmed={handleConfirmed}
        />
      )}
    </Card>
  );
}
