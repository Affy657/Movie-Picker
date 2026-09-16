import { useId, useRef } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';
import { useTranslation } from '@/shared/i18n';
import dragStyles from './SheetDrag.module.css';
import IconButton from './IconButton';
import Modal from './Modal';
import styles from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: SheetSize;
}

export type SheetSize = 'md' | 'lg';

export default function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
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
      className={clsx(styles.dialog, size === 'lg' && styles.dialogTall, dragStyles.surface)}
    >
      {open && (
        <>
          <div className={dragStyles.grab} {...dragBind}>
            <span className={dragStyles.handle} aria-hidden="true" />
            <div className={styles.head}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              <IconButton label={t('common.close')} onClick={onClose}>
                <X aria-hidden size={16} />
              </IconButton>
            </div>
          </div>
          <div className={styles.body}>{children}</div>
          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </>
      )}
    </Modal>
  );
}
