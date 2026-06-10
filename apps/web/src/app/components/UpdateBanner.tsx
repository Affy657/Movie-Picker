import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import styles from './UpdateBanner.module.css';

export default function UpdateBanner() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    globalThis.addEventListener('pwa-update', handler);
    return () => globalThis.removeEventListener('pwa-update', handler);
  }, []);

  if (!show) return null;

  return (
    <output className={styles.root}>
      <span className={styles.iconWrap} aria-hidden="true">
        <RefreshCw className={styles.icon} />
      </span>
      <p className={styles.text}>{t('pwaUpdate.message')}</p>
      <button
        type="button"
        className={styles.reloadBtn}
        onClick={() => globalThis.location.reload()}
      >
        {t('pwaUpdate.reload')}
      </button>
      <button
        type="button"
        className={styles.dismissBtn}
        onClick={() => setShow(false)}
        aria-label={t('pwaUpdate.dismiss')}
      >
        <X className={styles.dismissIcon} aria-hidden="true" />
      </button>
    </output>
  );
}
