import { useState } from 'react';
import { X } from 'lucide-react';
import { useLocation } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import { useCopyFeedback } from '@/shared/hooks/useCopyFeedback';
import { buildSystemBrowserOpenUrl, isKnownInAppBrowser } from '@/shared/utils/inAppBrowser';
import styles from './InAppBrowserBanner.module.css';
import Button, { buttonClass } from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';

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
        <IconButton label={t('common.close')} onClick={() => setDismissed(true)}>
          <X size={18} aria-hidden />
        </IconButton>
      </div>
      <div className={styles.actions}>
        {systemBrowserUrl ? (
          <a
            className={buttonClass({ variant: 'primary', size: 'sm', className: styles.openLink })}
            href={systemBrowserUrl}
          >
            {t('inAppBrowser.banner.openInBrowser')}
          </a>
        ) : null}
        <Button
          type="button"
          size="sm"
          className={styles.copyBtn}
          onClick={() => copy(currentUrl)}
          aria-live="polite"
        >
          {copied ? t('inAppBrowser.banner.copied') : t('inAppBrowser.banner.copyLink')}
        </Button>
      </div>
    </section>
  );
}
