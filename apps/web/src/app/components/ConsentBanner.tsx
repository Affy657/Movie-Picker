import { useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useConsent } from '@/shared/contexts/ConsentContext';
import ConsentDialog from '@/shared/components/ConsentDialog';
import styles from './ConsentBanner.module.css';
import { useCloseOnPageChange } from '@/shared/hooks/useCloseOnPageChange';
import Button from '@/shared/components/Button';
import Notice from '@/shared/components/Notice';

export default function ConsentBanner() {
  const { t } = useTranslation();
  const { decided, acceptAll, rejectAll } = useConsent();
  const [dialogOpen, setDialogOpen] = useState(false);
  useCloseOnPageChange(() => setDialogOpen(false));

  if (decided) return null;

  return (
    <>
      <Notice
        placement="bottom"
        title={t('consent.banner.title')}
        description={t('consent.banner.description')}
      >
        <div className={styles.choices}>
          <Button type="button" size="sm" className={styles.rejectBtn} onClick={rejectAll}>
            {t('consent.banner.rejectAll')}
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={styles.customizeBtn}
            onClick={() => setDialogOpen(true)}
          >
            {t('consent.banner.customize')}
          </Button>
        </div>
      </Notice>
      <ConsentDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
