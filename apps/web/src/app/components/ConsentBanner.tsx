import { useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useConsent } from '@/shared/contexts/ConsentContext';
import ConsentDialog from '@/shared/components/ConsentDialog';
import styles from './ConsentBanner.module.css';
import Button from '@/shared/components/Button';

export default function ConsentBanner() {
  const { t } = useTranslation();
  const { decided, acceptAll, rejectAll } = useConsent();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (decided) return null;

  return (
    <>
      <section className={styles.root} aria-label={t('consent.banner.title')} aria-live="polite">
        <div className={styles.content}>
          <p className={styles.title}>{t('consent.banner.title')}</p>
          <p className={styles.description}>{t('consent.banner.description')}</p>
        </div>
        <div className={styles.actions}>
          <Button type="button" size="sm" className={styles.rejectBtn} onClick={rejectAll}>
            {t('consent.banner.rejectAll')}
          </Button>
          <Button
            type="button"
            size="sm"
            className={styles.customizeBtn}
            onClick={() => setDialogOpen(true)}
          >
            {t('consent.banner.customize')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={styles.acceptBtn}
            onClick={acceptAll}
          >
            {t('consent.banner.acceptAll')}
          </Button>
        </div>
      </section>
      <ConsentDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
