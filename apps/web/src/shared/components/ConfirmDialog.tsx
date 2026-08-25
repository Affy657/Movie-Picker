import { useId } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import styles from './ConfirmDialog.module.css';

type ConfirmDialogProps = {
  open: boolean;

  title: string;

  message: string;

  confirmLabel?: string;

  cancelLabel?: string;

  confirmVariant?: 'danger' | 'primary';

  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;

  testId?: string;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'danger',
  busy = false,
  onConfirm,
  onCancel,
  testId = 'confirm-dialog',
}: Readonly<ConfirmDialogProps>) {
  const { t } = useTranslation();
  const reactId = useId();
  const titleId = `confirm-dialog-title-${reactId}`;
  const messageId = `confirm-dialog-message-${reactId}`;

  const dialogRef = useModalDialog(open, onCancel);

  const confirmText = confirmLabel ?? t('common.confirm');
  const cancelText = cancelLabel ?? t('common.cancel');

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      data-testid={testId}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <p id={messageId} className={styles.message}>
        {message}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-sm"
          onClick={onCancel}
          data-testid={`${testId}-cancel`}
        >
          {cancelText}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={busy}
          data-testid={`${testId}-confirm`}
          autoFocus
        >
          {confirmText}
        </button>
      </div>
    </dialog>
  );
}
