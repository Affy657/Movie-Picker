import { useId } from 'react';
import { X } from 'lucide-react';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useCopyFeedback } from '@/shared/hooks/useCopyFeedback';
import type { PwaInstallGuideMode } from '@/shared/pwa/pwaInstall';
import styles from './InstallPwaDialog.module.css';

const GUIDE_COPY: Record<
  PwaInstallGuideMode,
  { title: TranslationKey; intro: TranslationKey; steps: TranslationKey[] }
> = {
  ios: {
    title: 'pwaInstall.guide.ios.title',
    intro: 'pwaInstall.guide.ios.intro',
    steps: [
      'pwaInstall.guide.ios.step1',
      'pwaInstall.guide.ios.step2',
      'pwaInstall.guide.ios.step3',
    ],
  },
  in_app: {
    title: 'pwaInstall.guide.inApp.title',
    intro: 'pwaInstall.guide.inApp.intro',
    steps: [
      'pwaInstall.guide.inApp.step1',
      'pwaInstall.guide.inApp.step2',
      'pwaInstall.guide.inApp.step3',
    ],
  },
  generic: {
    title: 'pwaInstall.guide.generic.title',
    intro: 'pwaInstall.guide.generic.intro',
    steps: [
      'pwaInstall.guide.generic.step1',
      'pwaInstall.guide.generic.step2',
      'pwaInstall.guide.generic.step3',
    ],
  },
};

type InstallPwaDialogProps = {
  open: boolean;
  mode: PwaInstallGuideMode;
  onClose: () => void;
};

export default function InstallPwaDialog({ open, mode, onClose }: Readonly<InstallPwaDialogProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useModalDialog(open, onClose);
  const { copied, copy } = useCopyFeedback();

  const copyKeys = GUIDE_COPY[mode];
  const title = t(copyKeys.title);
  const intro = t(copyKeys.intro);
  const steps = copyKeys.steps.map((key) => t(key));

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <p className={styles.intro}>{intro}</p>
        <ol className={styles.steps}>
          {steps.map((step) => (
            <li key={step} className={styles.step}>
              {step}
            </li>
          ))}
        </ol>
        {mode === 'in_app' ? (
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => copy(window.location.href)}
            >
              {copied ? t('pwaInstall.copied') : t('pwaInstall.copyLink')}
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              {t('common.close')}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
