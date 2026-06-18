import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import styles from './UpdateBanner.module.css';

export default function UpdateBanner() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <output className={styles.root}>
      <span className={styles.iconWrap} aria-hidden="true">
        <RefreshCw className={styles.icon} />
      </span>
      <p className={styles.text}>{t('pwaUpdate.message')}</p>
      <button
        type="button"
        className={styles.reloadBtn}
        onClick={() => void updateServiceWorker(true)}
      >
        {t('pwaUpdate.reload')}
      </button>
      <button
        type="button"
        className={styles.dismissBtn}
        onClick={() => setNeedRefresh(false)}
        aria-label={t('pwaUpdate.dismiss')}
      >
        <X className={styles.dismissIcon} aria-hidden="true" />
      </button>
    </output>
  );
}
