import { useId, useRef } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';
import { useTranslation } from '@/shared/i18n';
import dragStyles from './SheetDrag.module.css';
import IconButton from './IconButton';
import Modal from './Modal';
import styles from './Sheet.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: SheetSize;
  detail?: React.ReactNode;
  ariaDescribedBy?: string;
  className?: string;
}

export type SheetSize = 'md' | 'lg';

export default function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  detail,
  ariaDescribedBy,
  className,
}: Readonly<SheetProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragBind = useSheetDrag(dialogRef, onClose, open);

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabelledBy={titleId}
      ariaDescribedBy={ariaDescribedBy}
      dialogRef={dialogRef}
      className={clsx(
        styles.dialog,
        size === 'lg' && styles.dialogTall,
        dragStyles.surface,
        className
      )}
    >
      {open && (
        <>
          <div className={dragStyles.grab} {...dragBind}>
            <span
              className={clsx(dragStyles.handle, dragStyles.handleMobileOnly)}
              aria-hidden="true"
            />
            <div className={styles.head}>
              <div className={styles.heading}>
                <h2 id={titleId} className={styles.title}>
                  {title}
                </h2>
                {detail}
              </div>
              <IconButton ariaLabel={t('common.close')} onClick={onClose}>
                <X aria-hidden size={ICON_SIZE.lg} />
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
