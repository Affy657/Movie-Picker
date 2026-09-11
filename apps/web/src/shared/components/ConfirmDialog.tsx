import { useId } from 'react';
import { useTranslation } from '@/shared/i18n';
import Button from './Button';
import Modal from './Modal';
import styles from './ConfirmDialog.module.css';

type ConfirmDialogProps = {
  open: boolean;

  title: string;

  message: string;

  confirmLabel?: string;

  cancelLabel?: string;

  confirmVariant?: 'danger' | 'primary';

  busy?: boolean;

  hideCancel?: boolean;
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
  hideCancel = false,
  onConfirm,
  onCancel,
  testId = 'confirm-dialog',
}: Readonly<ConfirmDialogProps>) {
  const { t } = useTranslation();
  const reactId = useId();
  const titleId = `confirm-dialog-title-${reactId}`;
  const messageId = `confirm-dialog-message-${reactId}`;

  const confirmText = confirmLabel ?? t('common.confirm');
  const cancelText = cancelLabel ?? t('common.cancel');

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      padded
      labelledBy={titleId}
      describedBy={messageId}
      testId={testId}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <p id={messageId} className={styles.message}>
        {message}
      </p>
      <div className={styles.actions}>
        {!hideCancel && (
          <Button size="sm" onClick={onCancel} data-testid={`${testId}-cancel`}>
            {cancelText}
          </Button>
        )}
        <Button
          size="sm"
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={busy}
          data-testid={`${testId}-confirm`}
          autoFocus
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
