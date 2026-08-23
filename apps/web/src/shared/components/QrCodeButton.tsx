import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Download, Link2, QrCode, X } from 'lucide-react';
import QRCodeImport from 'react-qr-code';
import Avatar from '@/shared/components/Avatar';
import { useCopyFeedback } from '@/shared/hooks/useCopyFeedback';
import styles from './QrCodeButton.module.css';

const QR_SIZE_MODAL = 240;
const QR_BG_COLOR = '#ffffff';
const QR_FG_COLOR = '#111827';
const QR_EXPORT_SCALE = 4;

const QRCode =
  typeof QRCodeImport === 'object' &&
  QRCodeImport !== null &&
  'QRCode' in QRCodeImport &&
  !('$$typeof' in QRCodeImport)
    ? (QRCodeImport as unknown as { QRCode: typeof QRCodeImport }).QRCode
    : QRCodeImport;

interface QrCodeButtonProps {
  url: string;
  displayUrl?: string;
  dialogTitle: string;
  hint: string;
  showLabel: string;
  closeLabel: string;
  className?: string;

  withLabel?: boolean;

  avatarId?: string | null;
  displayName?: string;
  handle?: string;

  copyLabel?: string;
  copiedLabel?: string;
  downloadLabel?: string;
}

export default function QrCodeButton({
  url,
  displayUrl,
  dialogTitle,
  hint,
  showLabel,
  closeLabel,
  className,
  withLabel = false,
  avatarId,
  displayName,
  handle,
  copyLabel,
  copiedLabel,
  downloadLabel,
}: Readonly<QrCodeButtonProps>) {
  const [open, setOpen] = useState(false);
  const { copied, copy } = useCopyFeedback();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

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
    if (open && !el.open) {
      if (el.showModal) el.showModal();
      else el.setAttribute('open', '');
    } else if (!open && el.open) {
      if (el.close) el.close();
      else el.removeAttribute('open');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    const onClick = (e: MouseEvent) => {
      if (e.target === el) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    el?.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      el?.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleCopy = useCallback(() => {
    copy(url);
  }, [copy, url]);

  const handleDownload = useCallback(() => {
    const svg = qrWrapRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onerror = () => URL.revokeObjectURL(svgUrl);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = QR_SIZE_MODAL * QR_EXPORT_SCALE;
      canvas.height = QR_SIZE_MODAL * QR_EXPORT_SCALE;
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(svgUrl);
      if (!ctx) return;
      ctx.fillStyle = QR_BG_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `qr-${handle ?? 'code'}.png`;
        link.click();
        URL.revokeObjectURL(blobUrl);
      }, 'image/png');
    };
    img.src = svgUrl;
  }, [handle]);

  const showActions = open && !!copyLabel && !!copiedLabel && !!downloadLabel;

  return (
    <>
      <button
        type="button"
        className={className ?? 'btn'}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={withLabel ? undefined : showLabel}
        title={withLabel ? undefined : showLabel}
      >
        <QrCode size={withLabel ? 15 : 16} aria-hidden />
        {withLabel ? <span className={styles.showLabel}>{showLabel}</span> : null}
      </button>
      <dialog
        ref={dialogRef}
        className={styles.qrDialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
      >
        <div className={styles.qrDialogInner}>
          <header className={styles.qrDialogHeader}>
            <h2 id={titleId} className={styles.qrDialogTitle}>
              {dialogTitle}
            </h2>
            <button
              type="button"
              className={styles.qrDialogClose}
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          {open && displayName && handle && (
            <div className={styles.identity}>
              <Avatar avatarId={avatarId} pseudo={displayName} size="md" />
              <span className={styles.identityText}>
                <span className={styles.identityName}>{displayName}</span>
                <span className={styles.identityHandle}>@{handle}</span>
              </span>
            </div>
          )}

          <div className={styles.qrCanvas} ref={qrWrapRef}>
            <QRCode
              value={url}
              size={QR_SIZE_MODAL}
              level="M"
              title={dialogTitle}
              bgColor={QR_BG_COLOR}
              fgColor={QR_FG_COLOR}
            />
          </div>
          <p className={styles.qrHint}>{hint}</p>
          <p className={styles.qrUrl}>{displayUrl ?? url}</p>

          {showActions && (
            <div className={styles.actions}>
              <button
                type="button"
                className={`btn btn-sm ${styles.actionBtn}`}
                onClick={handleCopy}
              >
                <Link2 size={15} aria-hidden />
                <span className={styles.btnLabel}>{copied ? copiedLabel : copyLabel}</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${styles.actionBtn}`}
                onClick={handleDownload}
              >
                <Download size={15} aria-hidden />
                <span className={styles.btnLabel}>{downloadLabel}</span>
              </button>
            </div>
          )}

          {showActions && (
            <span className="visually-hidden" role="status" aria-live="polite">
              {copied ? copiedLabel : ''}
            </span>
          )}
        </div>
      </dialog>
    </>
  );
}
