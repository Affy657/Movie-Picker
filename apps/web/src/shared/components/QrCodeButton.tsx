import { useEffect, useId, useRef, useState } from 'react';
import { QrCode, X } from 'lucide-react';
import QRCodeImport from 'react-qr-code';
import styles from './QrCodeButton.module.css';

const QR_SIZE_MODAL = 240;
const QR_BG_COLOR = '#ffffff';
const QR_FG_COLOR = '#111827';

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
}

export default function QrCodeButton({
  url,
  displayUrl,
  dialogTitle,
  hint,
  showLabel,
  closeLabel,
  className,
}: Readonly<QrCodeButtonProps>) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
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

  return (
    <>
      <button
        type="button"
        className={className ?? 'btn'}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={showLabel}
        title={showLabel}
      >
        <QrCode size={16} aria-hidden />
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
          <div className={styles.qrCanvas}>
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
        </div>
      </dialog>
    </>
  );
}
