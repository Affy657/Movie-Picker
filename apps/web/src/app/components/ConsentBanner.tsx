import { useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useConsent } from '@/shared/contexts/ConsentContext';
import ConsentDialog from '@/shared/components/ConsentDialog';
import styles from './ConsentBanner.module.css';

export default function ConsentBanner() {
  const { t } = useTranslation();
  const { decided, acceptAll, rejectAll } = useConsent();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (decided) return null;

  return (
    <>
      <div
        className={styles.root}
        role="dialog"
        aria-labelledby="consent-banner-title"
        aria-modal="false"
      >
        <div className={styles.content}>
          <p className={styles.title} id="consent-banner-title">
            {t('consent.banner.title')}
          </p>
          <p className={styles.description}>{t('consent.banner.description')}</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={`btn btn-sm ${styles.rejectBtn}`} onClick={rejectAll}>
            {t('consent.banner.rejectAll')}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${styles.customizeBtn}`}
            onClick={() => setDialogOpen(true)}
          >
            {t('consent.banner.customize')}
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-primary ${styles.acceptBtn}`}
            onClick={acceptAll}
          >
            {t('consent.banner.acceptAll')}
          </button>
        </div>
      </div>
      <ConsentDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
