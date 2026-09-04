import { useId } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';
import { useTranslation } from '@/shared/i18n';
import dragStyles from './sheetDrag.module.css';
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
  const dialogRef = useModalDialog(open, onClose);
  const dragBind = useSheetDrag(dialogRef, onClose, open);

  return (
    <dialog
      ref={dialogRef}
      className={clsx(styles.dialog, size === 'tall' && styles.dialogTall, dragStyles.surface)}
      aria-labelledby={titleId}
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
    </dialog>
  );
}
