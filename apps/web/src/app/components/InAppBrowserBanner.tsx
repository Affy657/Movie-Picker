import { useState } from 'react';
import { X } from 'lucide-react';
import { useLocation } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import { useCopyFeedback } from '@/shared/hooks/useCopyFeedback';
import { isStandaloneRuntime } from '@/shared/hooks/usePwaInstall';
import { buildSystemBrowserOpenUrl, isKnownInAppBrowser } from '@/shared/utils/inAppBrowser';
import { safeLocalStorageGet, safeLocalStorageSet } from '@/shared/utils/safeStorage';
import styles from './InAppBrowserBanner.module.css';
import Button, { buttonClass } from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';

export const IN_APP_BANNER_DISMISSED_KEY = 'moviepicker_in_app_browser_dismissed_at';
export const IN_APP_BANNER_DISMISSAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isDismissalFresh(now: number): boolean {
  const raw = safeLocalStorageGet(IN_APP_BANNER_DISMISSED_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  return Number.isFinite(dismissedAt) && now - dismissedAt < IN_APP_BANNER_DISMISSAL_TTL_MS;
}

function shouldOfferSystemBrowser(): boolean {
  if (isStandaloneRuntime()) return false;
  if (!isKnownInAppBrowser(navigator.userAgent)) return false;
  return !isDismissalFresh(Date.now());
}

export default function InAppBrowserBanner() {
  const { t } = useTranslation();
  const location = useLocation();
  const { copied, copy } = useCopyFeedback();
  const [visible, setVisible] = useState(shouldOfferSystemBrowser);

  if (!visible) return null;

  const rememberDismissal = () =>
    safeLocalStorageSet(IN_APP_BANNER_DISMISSED_KEY, String(Date.now()));
  const dismiss = () => {
    rememberDismissal();
    setVisible(false);
  };

  const currentUrl = `${window.location.origin}${location.pathname}${location.search}${location.hash}`;
  const systemBrowserUrl = buildSystemBrowserOpenUrl(currentUrl, navigator.userAgent);

  return (
    <Card
      as="section"
      padding="none"
      elevation="lg"
      className={styles.root}
      aria-label={t('inAppBrowser.banner.title')}
      aria-live="polite"
    >
      <div className={styles.header}>
        <div className={styles.content}>
          <p className={styles.title}>{t('inAppBrowser.banner.title')}</p>
          <p className={styles.description}>{t('inAppBrowser.banner.description')}</p>
        </div>
        <IconButton ariaLabel={t('common.close')} onClick={dismiss}>
          <X size={ICON_SIZE.lg} aria-hidden />
        </IconButton>
      </div>
      <div className={styles.actions}>
        {systemBrowserUrl ? (
          <a
            className={buttonClass({ variant: 'primary', size: 'sm', className: styles.openLink })}
            href={systemBrowserUrl}
            onClick={rememberDismissal}
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
    </Card>
  );
}
