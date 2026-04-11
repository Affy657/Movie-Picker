import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import QRCodeImport from 'react-qr-code';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';
import { useTranslation } from '@/shared/i18n';
import styles from './ShareLink.module.css';

const QR_SIZE = 160;
const QR_BG_COLOR = '#ffffff';
const QR_FG_COLOR = '#111827';
const COPIED_RESET_MS = 2000;

/**
 * Interop CJS / bundler : `default` peut être `{ QRCode, default }` au lieu du forwardRef → React #130.
 */
const QRCode =
  typeof QRCodeImport === 'object' &&
  QRCodeImport !== null &&
  'QRCode' in QRCodeImport &&
  !('$$typeof' in QRCodeImport)
    ? (QRCodeImport as unknown as { QRCode: typeof QRCodeImport }).QRCode
    : QRCodeImport;

interface ShareLinkProps {
  url: string;
  /** Affiche le bouton et le panneau QR (URL invité uniquement — ne pas utiliser pour un lien hôte secret). */
  showQr?: boolean;
  /** Aligne les actions au centre (ex. en-tête page soirée). */
  centeredActions?: boolean;
}

export default function ShareLink({
  url,
  showQr = false,
  centeredActions = false,
}: ShareLinkProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);
  const [qrOpen, setQrOpen] = useState(false);

  const shareLabel = copied ? t('events.share.copiedButton') : t('events.share.shareButton');

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          url,
          text: t('events.share.shareText'),
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
      copyTimerRef.current = window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
    }
  };

  return (
    <div
      className={clsx(styles.root, centeredActions && styles.rootCentered)}
      role="group"
      aria-label={t('events.share.groupLabel')}
    >
      <p role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {copied ? t('events.share.copiedButton') : ''}
      </p>
      <div className={clsx(styles.actions, centeredActions && styles.actionsCentered)}>
        <button type="button" className="btn btn-primary" onClick={() => void handleShare()}>
          {shareLabel}
        </button>
        {showQr ? (
          <button
            type="button"
            className={clsx('btn', styles.btnQr)}
            onClick={() => setQrOpen((o) => !o)}
            aria-expanded={qrOpen}
          >
            {qrOpen ? t('events.share.hideQr') : t('events.share.showQr')}
          </button>
        ) : null}
      </div>
      {showQr && qrOpen ? (
        <div className={clsx(styles.qrPanel, centeredActions && styles.qrPanelCentered)}>
          <div className={styles.qrCanvas}>
            <QRCode
              value={url}
              size={QR_SIZE}
              level="M"
              title={t('events.share.qrTitle')}
              bgColor={QR_BG_COLOR}
              fgColor={QR_FG_COLOR}
            />
          </div>
          <p className={styles.qrHint}>{t('events.share.qrHint')}</p>
        </div>
      ) : null}
    </div>
  );
}
