import { useId } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useRef } from 'react';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';
import { useTranslation } from '@/shared/i18n';
import dragStyles from './sheetDrag.module.css';
import Modal from './Modal';
import styles from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'default' | 'tall';
}

export default function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'default',
}: Readonly<SheetProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragBind = useSheetDrag(dialogRef, onClose, open);

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      dialogRef={dialogRef}
      className={clsx(styles.dialog, size === 'tall' && styles.dialogTall, dragStyles.surface)}
    >
      {open && (
        <>
          <div className={dragStyles.grab} {...dragBind}>
            <span className={dragStyles.handle} aria-hidden="true" />
            <div className={styles.head}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              <button
                type="button"
                className={`icon-btn-outline ${styles.closeBtn}`}
                onClick={onClose}
                aria-label={t('common.close')}
              >
                <X aria-hidden size={16} />
              </button>
            </div>
          </div>
          <div className={styles.body}>{children}</div>
          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </>
      )}
    </Modal>
  );
}
