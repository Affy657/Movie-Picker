import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import styles from './UpdateBanner.module.css';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

function useServiceWorkerUpdate() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) setRegistration(r);
    },
  });

  const needRefreshRef = useRef(needRefresh);
  needRefreshRef.current = needRefresh;

  useEffect(() => {
    if (!registration) return;

    const checkForUpdate = () => {
      if (registration.installing || !navigator.onLine) return;
      registration.update().catch(() => {});
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      } else if (needRefreshRef.current) {
        updateServiceWorker(true).catch(() => {});
      }
    };

    const intervalId = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', checkForUpdate);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', checkForUpdate);
    };
  }, [registration, updateServiceWorker]);

  return {
    needRefresh,
    reload: () => updateServiceWorker(true).catch(() => {}),
    dismiss: () => setNeedRefresh(false),
  };
}

export default function UpdateBanner() {
  const { t } = useTranslation();
  const { needRefresh, reload, dismiss } = useServiceWorkerUpdate();

  if (!needRefresh) return null;

  return (
    <output className={styles.root}>
      <span className={styles.iconWrap} aria-hidden="true">
        <RefreshCw className={styles.icon} />
      </span>
      <p className={styles.text}>{t('pwaUpdate.message')}</p>
      <button type="button" className={styles.reloadBtn} onClick={reload}>
        {t('pwaUpdate.reload')}
      </button>
      <button
        type="button"
        className={styles.dismissBtn}
        onClick={dismiss}
        aria-label={t('pwaUpdate.dismiss')}
      >
        <X className={styles.dismissIcon} aria-hidden="true" />
      </button>
    </output>
  );
}
