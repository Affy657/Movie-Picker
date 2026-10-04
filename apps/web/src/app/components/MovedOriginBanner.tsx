import { useEffect, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { usePwaInstallClick } from '@/shared/hooks/usePwaInstall';
import { dismissMovedOriginNotice, isMovedOriginNoticePending } from '@/shared/pwa/movedOrigin';
import { shouldOfferSystemBrowser } from './InAppBrowserBanner';
import Notice from '@/shared/components/Notice';
import Button from '@/shared/components/Button';
import InstallPwaDialog from '@/shared/components/InstallPwaDialog';

function shouldShowNotice(): boolean {
  return isMovedOriginNoticePending() && !shouldOfferSystemBrowser();
}

export default function MovedOriginBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(shouldShowNotice);
  const install = usePwaInstallClick('moved_origin');

  useEffect(() => {
    if (!visible || install.shouldShow) return;
    dismissMovedOriginNotice();
    setVisible(false);
  }, [install.shouldShow, visible]);

  if (!visible) return null;

  const dismiss = () => {
    dismissMovedOriginNotice();
    setVisible(false);
  };

  return (
    <>
      <Notice
        title={t('movedOrigin.banner.title')}
        description={t('movedOrigin.banner.description')}
        onClose={dismiss}
      >
        <Button
          type="button"
          variant="primary"
          size="sm"
          aria-haspopup={install.mode === 'native' ? undefined : 'dialog'}
          onClick={() => void install.onClick()}
        >
          {t('pwaInstall.trigger')}
        </Button>
        <Button type="button" size="sm" onClick={dismiss}>
          {t('movedOrigin.banner.dismiss')}
        </Button>
      </Notice>
      {install.guideOpen ? (
        <InstallPwaDialog open mode={install.guideMode} onClose={install.closeGuide} />
      ) : null}
    </>
  );
}
