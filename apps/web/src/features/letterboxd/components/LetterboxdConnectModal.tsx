import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Clock, Eye, Import, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { invalidateWatchlist } from '@/features/watchlist/hooks/useWatchlist';
import DialogTitleBar from '@/shared/components/DialogTitleBar';
import InfoBubble from '@/shared/components/InfoBubble';
import {
  syncLetterboxd,
  type LetterboxdConfirmResult,
  type LetterboxdPendingChoice,
  type LetterboxdSyncReport,
} from '@/features/letterboxd/api/letterboxdApi';
import type { UserProfile } from '@/features/auth/types';
import LetterboxdChoicesModal from './LetterboxdChoicesModal';
import styles from './LetterboxdConnectModal.module.css';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';

interface LetterboxdConnectModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'form' | 'arbitrate' | 'done';

function ConnectFormModal({
  onClose,
  onConnected,
}: Readonly<{ onClose: () => void; onConnected: (report: LetterboxdSyncReport) => void }>) {
  const { t } = useTranslation();
  const { patchProfile } = useAuth();
  const queryClient = useQueryClient();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const connectAction = useCallback(async () => {
    await patchProfile({ letterboxdUsername: username.trim() });
    const result = await syncLetterboxd(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    void invalidateWatchlist(queryClient);
    return result;
  }, [patchProfile, queryClient, username]);

  const {
    run: runConnect,
    loading: connecting,
    error: connectError,
  } = useAsyncAction(connectAction, t('auth.account.letterboxd.connectFallbackError'));

  const handleSubmit = async () => {
    const result = await runConnect();
    if (result) onConnected(result);
  };

  return (
    <Modal open onClose={onClose} size="md" column labelledBy={titleId}>
      <DialogTitleBar
        titleId={titleId}
        title={
          <>
            {t('auth.account.letterboxd.connectTitle')}
            <InfoBubble label={t('auth.account.letterboxd.helpTitle')}>
              <p>{t('auth.account.letterboxd.helpSync')}</p>
              <p>{t('auth.account.letterboxd.helpSafety')}</p>
              <p>{t('auth.account.letterboxd.helpUsername')}</p>
            </InfoBubble>
          </>
        }
        onClose={onClose}
        closeLabel={t('common.close')}
      />

      <p className={styles.intro}>{t('auth.account.letterboxd.connectIntro')}</p>

      <form
        className={styles.body}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <div className={styles.fieldCol}>
          <label className={styles.fieldLabel} htmlFor="letterboxd-connect-username">
            {t('auth.account.letterboxd.usernameLabel')}
          </label>
          <input
            ref={inputRef}
            id="letterboxd-connect-username"
            type="text"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('auth.account.letterboxd.usernamePlaceholder')}
            maxLength={40}
            disabled={connecting}
          />
        </div>

        {connecting ? (
          <div className={styles.progress}>
            <div className={styles.progressTrack}>
              <progress
                className={styles.progressControl}
                aria-label={t('auth.account.letterboxd.connectSyncingAria')}
              />
              <span className={styles.progressBarFill} aria-hidden />
            </div>
            <p className={styles.progressText}>{t('auth.account.letterboxd.connectSyncingHint')}</p>
          </div>
        ) : (
          <div className={styles.steps}>
            <span className={styles.step}>
              <span className={styles.stepDot}>
                <span className={styles.stepDotText}>1</span>
              </span>
              <span>{t('auth.account.letterboxd.connectStep1')}</span>
            </span>
            <span className={styles.step}>
              <span className={styles.stepDot}>
                <span className={styles.stepDotText}>2</span>
              </span>
              <span>{t('auth.account.letterboxd.connectStep2')}</span>
            </span>
            <span className={styles.step}>
              <span className={styles.stepDot}>
                <span className={styles.stepDotText}>3</span>
              </span>
              <span>{t('auth.account.letterboxd.connectStep3')}</span>
            </span>
          </div>
        )}

        {connectError && (
          <p className={styles.error} role="alert">
            {connectError}
          </p>
        )}

        <div className={styles.footer}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={connecting}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={connecting || username.trim().length === 0}
          >
            <Import size={15} aria-hidden />
            <span>
              {connecting
                ? t('auth.account.letterboxd.connectSubmitting')
                : t('auth.account.letterboxd.connectSubmit')}
            </span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DoneModal({
  onClose,
  addedCount,
  confirmedCount,
  unmatchedTitles,
  undecidedTitles,
}: Readonly<{
  onClose: () => void;
  addedCount: number;
  confirmedCount: number;
  unmatchedTitles: string[];
  undecidedTitles: string[];
}>) {
  const { t } = useTranslation();
  const titleId = useId();
  const unmatchedCount = unmatchedTitles.length;
  const undecidedCount = undecidedTitles.length;

  return (
    <Modal open onClose={onClose} size="md" column labelledBy={titleId}>
      <DialogTitleBar
        titleId={titleId}
        title={t('auth.account.letterboxd.doneTitle')}
        onClose={onClose}
        closeLabel={t('common.close')}
      />

      <div className={styles.body}>
        <div className={styles.report}>
          {addedCount > 0 && (
            <span className={styles.reportRow}>
              <span className={styles.reportIconOk}>
                <Check size={14} aria-hidden />
              </span>
              <span>
                {addedCount === 1
                  ? t('auth.account.letterboxd.doneAddedOne')
                  : t('auth.account.letterboxd.doneAdded', { count: addedCount })}
              </span>
            </span>
          )}
          {confirmedCount > 0 && (
            <span className={styles.reportRow}>
              <span className={styles.reportIconOk}>
                <Check size={14} aria-hidden />
              </span>
              <span>
                {confirmedCount === 1
                  ? t('auth.account.letterboxd.doneConfirmedOne')
                  : t('auth.account.letterboxd.doneConfirmed', { count: confirmedCount })}
              </span>
            </span>
          )}
          {unmatchedCount > 0 && (
            <span className={styles.reportRow}>
              <span className={styles.reportIcon}>
                <TriangleAlert size={13} aria-hidden />
              </span>
              <span>
                {unmatchedCount === 1
                  ? t('auth.account.letterboxd.doneUnmatchedOne')
                  : t('auth.account.letterboxd.doneUnmatched', { count: unmatchedCount })}
              </span>
            </span>
          )}
          {unmatchedCount > 0 && (
            <details className={styles.unmatched}>
              <summary>{t('auth.account.letterboxd.doneUnmatchedListToggle')}</summary>
              <ul className={styles.unmatchedList}>
                {unmatchedTitles.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </details>
          )}
          {undecidedCount > 0 && (
            <span className={styles.reportRow}>
              <span className={styles.reportIcon}>
                <Clock size={13} aria-hidden />
              </span>
              <span>
                {undecidedCount === 1
                  ? t('auth.account.letterboxd.doneUndecidedOne')
                  : t('auth.account.letterboxd.doneUndecided', { count: undecidedCount })}
              </span>
            </span>
          )}
          {undecidedCount > 0 && (
            <details className={styles.unmatched}>
              <summary>{t('auth.account.letterboxd.doneUndecidedListToggle')}</summary>
              <ul className={styles.unmatchedList}>
                {undecidedTitles.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <p className={styles.intro}>{t('auth.account.letterboxd.doneFooterNote')}</p>

        <div className={styles.footer}>
          <Button type="button" variant="primary" onClick={onClose}>
            <Eye size={14} aria-hidden />
            <span>{t('auth.account.letterboxd.doneCta')}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function LetterboxdConnectModal({
  open,
  onClose,
}: Readonly<LetterboxdConnectModalProps>) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('form');
  const [report, setReport] = useState<LetterboxdSyncReport | null>(null);
  const [confirmResult, setConfirmResult] = useState<LetterboxdConfirmResult | null>(null);
  const [unresolvedChoices, setUnresolvedChoices] = useState<LetterboxdPendingChoice[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep('form');
    setReport(null);
    setConfirmResult(null);
    setUnresolvedChoices([]);
  }, [open]);

  if (!open) return null;

  const handleConnected = (result: LetterboxdSyncReport) => {
    setReport(result);
    setStep(result.pendingChoices.length > 0 ? 'arbitrate' : 'done');
  };

  const handleArbitrationConfirmed = (
    result: LetterboxdConfirmResult,
    unresolved: LetterboxdPendingChoice[]
  ) => {
    setConfirmResult(result);
    setUnresolvedChoices(unresolved);
    setStep('done');
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

  if (step === 'form') {
    return <ConnectFormModal onClose={onClose} onConnected={handleConnected} />;
  }

  if (step === 'arbitrate' && report) {
    return (
      <LetterboxdChoicesModal
        open
        choices={report.pendingChoices}
        onClose={onClose}
        onConfirmed={handleArbitrationConfirmed}
      />
    );
  }

  const addedCount = report?.added ?? 0;
  const confirmedCount = confirmResult?.added ?? 0;
  const unmatchedTitles = report?.unmatchedTitles ?? [];
  const undecidedTitles = unresolvedChoices.map((choice) =>
    choice.year ? `${choice.title} (${choice.year})` : choice.title
  );

  return (
    <DoneModal
      onClose={onClose}
      addedCount={addedCount}
      confirmedCount={confirmedCount}
      unmatchedTitles={unmatchedTitles}
      undecidedTitles={undecidedTitles}
    />
  );
}
