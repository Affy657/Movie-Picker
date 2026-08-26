import { useState } from 'react';
import { X } from 'lucide-react';
import { useLocation } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import { useCopyFeedback } from '@/shared/hooks/useCopyFeedback';
import { buildSystemBrowserOpenUrl, isKnownInAppBrowser } from '@/shared/utils/inAppBrowser';
import styles from './InAppBrowserBanner.module.css';

export default function InAppBrowserBanner() {
  const { t } = useTranslation();
  const location = useLocation();
  const { copied, copy } = useCopyFeedback();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !isKnownInAppBrowser(navigator.userAgent)) return null;

  const currentUrl = `${window.location.origin}${location.pathname}${location.search}${location.hash}`;
  const systemBrowserUrl = buildSystemBrowserOpenUrl(currentUrl, navigator.userAgent);

  return (
    <section className={styles.root} aria-label={t('inAppBrowser.banner.title')} aria-live="polite">
      <div className={styles.header}>
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
      </div>
      <div className={styles.actions}>
        {systemBrowserUrl ? (
          <a className={`btn btn-sm btn-primary ${styles.openLink}`} href={systemBrowserUrl}>
            {t('inAppBrowser.banner.openInBrowser')}
          </a>
        ) : null}
        <button
          type="button"
          className={`btn btn-sm ${styles.copyBtn}`}
          onClick={() => copy(currentUrl)}
          aria-live="polite"
        >
          {copied ? t('inAppBrowser.banner.copied') : t('inAppBrowser.banner.copyLink')}
        </button>
      </div>
    </section>
  );
}
