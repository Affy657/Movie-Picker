import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import QRCodeImport from 'react-qr-code';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';
import { useTranslation } from '@/shared/i18n';
import styles from './ShareLink.module.css';

const QR_SIZE_MODAL = 240;
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
  /** Affiche le bouton et la modale QR (URL invité uniquement — ne pas utiliser pour un lien hôte secret). */
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Synchronise l'état React avec l'API native <dialog>.
  // `showModal` et `close` sont absents de certains environnements (jsdom).
  // L'interface `DialogAPI` les déclare explicitement optionnels pour que les
  // gardes soient légitimes côté analyse statique (pas de boolean gratuit).
  useEffect(() => {
    interface DialogAPI {
      readonly open: boolean;
      showModal?(): void;
      close?(): void;
      setAttribute(name: string, value: string): void;
      removeAttribute(name: string): void;
    }
    const el = dialogRef.current as unknown as DialogAPI | null;
    if (!el) return;
    if (qrOpen && !el.open) {
      if (el.showModal) el.showModal();
      else el.setAttribute('open', '');
    } else if (!qrOpen && el.open) {
      if (el.close) el.close();
      else el.removeAttribute('open');
    }
  }, [qrOpen]);

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
            onClick={() => setQrOpen(true)}
            aria-haspopup="dialog"
          >
            {t('events.share.showQr')}
          </button>
        ) : null}
      </div>
      {showQr ? (
        <dialog
          ref={dialogRef}
          className={styles.qrDialog}
          aria-labelledby="share-qr-title"
          onClose={() => setQrOpen(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setQrOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQrOpen(false);
          }}
        >
          <div className={styles.qrDialogInner}>
            <header className={styles.qrDialogHeader}>
              <h2 id="share-qr-title" className={styles.qrDialogTitle}>
                {t('events.share.qrTitle')}
              </h2>
              <button
                type="button"
                className={styles.qrDialogClose}
                onClick={() => setQrOpen(false)}
                aria-label={t('events.share.closeQr')}
              >
                <X size={18} aria-hidden />
              </button>
            </header>
            <div className={styles.qrCanvas}>
              <QRCode
                value={url}
                size={QR_SIZE_MODAL}
                level="M"
                title={t('events.share.qrTitle')}
                bgColor={QR_BG_COLOR}
                fgColor={QR_FG_COLOR}
              />
            </div>
            <p className={styles.qrHint}>{t('events.share.qrHint')}</p>
            <p className={styles.qrUrl}>{url}</p>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
