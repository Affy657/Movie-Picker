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

const QRCode =
  typeof QRCodeImport === 'object' &&
  QRCodeImport !== null &&
  'QRCode' in QRCodeImport &&
  !('$$typeof' in QRCodeImport)
    ? (QRCodeImport as unknown as { QRCode: typeof QRCodeImport }).QRCode
    : QRCodeImport;

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
}: ShareLinkProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);
  const [qrOpen, setQrOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  useEffect(() => {
    if (!qrOpen) return;
    const el = dialogRef.current;
    const onClick = (e: MouseEvent) => {
      if (e.target === el) setQrOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQrOpen(false);
    };
    el?.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      el?.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [qrOpen]);

  const shareLabel = copied ? t('events.share.copiedButton') : t('events.share.shareButton');

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        const shareText =
          title && eventTime && eventDate
            ? t('events.share.shareText', { title, time: eventTime, date: eventDate })
            : title && eventTime
              ? t('events.share.shareTextNoDate', { title, time: eventTime })
              : t('events.share.shareTextFallback');
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
            <p className={styles.qrUrl}>{displayUrl ?? url}</p>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
