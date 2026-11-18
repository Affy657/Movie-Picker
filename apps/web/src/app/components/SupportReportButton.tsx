import { useId, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';
import {
  SUPPORT_EMAIL,
  buildSupportMailto,
  buildSupportReportText,
  type SupportContext,
} from '@/shared/support/supportMailto';
import Modal, { ModalActions, ModalBody, ModalFooter } from '@/shared/components/Modal';
import styles from './SupportReportButton.module.css';
import { useCloseOnPageChange } from './useCloseOnPageChange';
import Button, { buttonClass } from '@/shared/components/Button';

type CopyState = 'idle' | 'copied' | 'failed';

type Props = {
  className?: string;
};

export default function SupportReportButton({ className }: Readonly<Props>) {
  const { t } = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  useCloseOnPageChange(() => setOpen(false));
  const titleId = useId();
  const reportId = useId();
  const introId = useId();

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
      {open ? (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          size="sm"
          column
          bottomSheetOnMobile
          title={t('support.dialogTitle')}
          titleId={titleId}
          ariaDescribedBy={introId}
        >
          <ModalBody className={styles.body}>
            <p id={introId} className={styles.intro}>
              {t('support.dialogIntro')}
            </p>

            <label className={styles.reportLabel} htmlFor={reportId}>
              {t('support.reportLabel')}
            </label>
            <textarea
              id={reportId}
              className={styles.report}
              value={reportText}
              readOnly
              rows={9}
            />
          </ModalBody>

          <ModalFooter className={styles.footer}>
            <ModalActions>
              <Button type="button" onClick={() => void handleCopy()}>
                {t('support.copyReport')}
              </Button>
              <a href={mailtoHref} className={buttonClass({ variant: 'primary' })}>
                {t('support.openMailApp')}
              </a>
            </ModalActions>

            <p className={styles.status} role="status" aria-live="polite">
              {copyState === 'copied' ? t('support.copied') : null}
              {copyState === 'failed' ? t('support.copyFailed') : null}
            </p>

            <p className={styles.hint}>{t('support.fallbackHint', { email: SUPPORT_EMAIL })}</p>
          </ModalFooter>
        </Modal>
      ) : null}
    </>
  );
}
