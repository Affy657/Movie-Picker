import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { isKnownInAppBrowser } from '@/shared/utils/inAppBrowser';
import styles from './InAppBrowserBanner.module.css';

export default function InAppBrowserBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !isKnownInAppBrowser(navigator.userAgent)) return null;

  return (
    <section className={styles.root} aria-label={t('inAppBrowser.banner.title')} aria-live="polite">
      <div className={styles.content}>
        <p className={styles.title}>{t('inAppBrowser.banner.title')}</p>
        <p className={styles.description}>{t('inAppBrowser.banner.description')}</p>
      </div>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={() => setDismissed(true)}
        aria-label={t('common.close')}
      >
        <X size={18} aria-hidden />
      </button>
    </section>
  );
}
