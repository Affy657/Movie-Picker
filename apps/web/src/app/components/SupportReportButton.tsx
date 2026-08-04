import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';
import {
  SUPPORT_EMAIL,
  buildSupportMailto,
  buildSupportReportText,
  type SupportContext,
} from '@/shared/support/supportMailto';
import styles from './SupportReportButton.module.css';

type CopyState = 'idle' | 'copied' | 'failed';

type Props = {
  className?: string;
};

export default function SupportReportButton({ className }: Readonly<Props>) {
  const { t } = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reportId = useId();

  const context = useMemo<SupportContext>(
    () => ({
      path: location.pathname,
      userAgent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
      labels: {
        subject: t('support.mailSubject'),
        describe: t('support.mailDescribe'),
        steps: t('support.mailSteps'),
        expected: t('support.mailExpected'),
        observed: t('support.mailObserved'),
        technicalHeader: t('support.mailTechnicalHeader'),
        page: t('support.mailPage'),
        version: t('support.mailVersion'),
        browser: t('support.mailBrowser'),
      },
    }),
    [location.pathname, t]
  );

  const reportText = useMemo(
    () =>
      buildSupportReportText(context, {
        recipientFieldLabel: t('support.recipientLabel'),
        subjectFieldLabel: t('support.subjectLabel'),
      }),
    [context, t]
  );

  const mailtoHref = useMemo(() => buildSupportMailto(context), [context]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dlg = dialogRef.current;
    const onBackdropClick = (e: MouseEvent) => {
      if (e.target === dlg) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    dlg?.addEventListener('click', onBackdropClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      dlg?.removeEventListener('click', onBackdropClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(reportText);
    setCopyState(ok ? 'copied' : 'failed');
  };

  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        onClick={() => {
          setCopyState('idle');
          setOpen(true);
        }}
      >
        {t('footer.reportIssue')}
      </button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
      >
        <div className={styles.inner}>
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {t('support.dialogTitle')}
            </h2>
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label={t('common.close')}
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          <p className={styles.intro}>{t('support.dialogIntro')}</p>

          <label className={styles.reportLabel} htmlFor={reportId}>
            {t('support.reportLabel')}
          </label>
          <textarea id={reportId} className={styles.report} value={reportText} readOnly rows={9} />

          <div className={styles.actions}>
            <a href={mailtoHref} className="btn btn-primary">
              {t('support.openMailApp')}
            </a>
            <button type="button" className="btn" onClick={() => void handleCopy()}>
              {t('support.copyReport')}
            </button>
          </div>

          <p className={styles.status} role="status" aria-live="polite">
            {copyState === 'copied' ? t('support.copied') : null}
            {copyState === 'failed' ? t('support.copyFailed') : null}
          </p>

          <p className={styles.hint}>{t('support.fallbackHint', { email: SUPPORT_EMAIL })}</p>
        </div>
      </dialog>
    </>
  );
}
