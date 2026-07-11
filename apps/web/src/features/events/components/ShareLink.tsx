import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Share2 } from 'lucide-react';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';
import { useTranslation } from '@/shared/i18n';
import QrCodeButton from '@/shared/components/QrCodeButton';
import styles from './ShareLink.module.css';

const COPIED_RESET_MS = 2000;

interface ShareLinkProps {
  url: string;
  displayUrl?: string;
  title?: string;
  eventTime?: string;
  eventDate?: string;

  showQr?: boolean;

  centeredActions?: boolean;
}

export default function ShareLink({
  url,
  displayUrl,
  title,
  eventTime,
  eventDate,
  showQr = false,
  centeredActions = false,
}: Readonly<ShareLinkProps>) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const shareLabel = copied ? t('events.share.copiedButton') : t('events.share.shareButton');

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        let shareText: string;
        if (title && eventTime && eventDate) {
          shareText = t('events.share.shareText', { title, time: eventTime, date: eventDate });
        } else if (title && eventTime) {
          shareText = t('events.share.shareTextNoDate', { title, time: eventTime });
        } else {
          shareText = t('events.share.shareTextFallback');
        }
        await navigator.share({
          title: title ?? 'Movie Picker',
          url,
          text: shareText,
        });
        return;
      } catch (e) {
        const err = e as { name?: string };
        if (err?.name === 'AbortError') return;
      }
    }
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = globalThis.setTimeout(() => setCopied(false), COPIED_RESET_MS);
    }
  };

  return (
    <div
      className={clsx(centeredActions && styles.rootCentered)}
      role="group"
      aria-label={t('events.share.groupLabel')}
    >
      <p role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {copied ? t('events.share.copiedButton') : ''}
      </p>
      <div className={clsx(styles.actions, centeredActions && styles.actionsCentered)}>
        <button
          type="button"
          className={clsx('btn btn-primary', styles.btnShareIcon)}
          onClick={() => void handleShare()}
          aria-label={shareLabel}
          title={shareLabel}
        >
          <Share2 size={16} aria-hidden />
        </button>
        {showQr ? (
          <QrCodeButton
            url={url}
            displayUrl={displayUrl}
            dialogTitle={t('events.share.qrTitle')}
            hint={t('events.share.qrHint')}
            showLabel={t('events.share.showQr')}
            closeLabel={t('events.share.closeQr')}
            className={clsx('btn', styles.btnQr)}
          />
        ) : null}
      </div>
    </div>
  );
}
