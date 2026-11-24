import { useId, useRef } from 'react';
import clsx from 'clsx';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';
import { useTranslation } from '@/shared/i18n';
import dragStyles from './SheetDrag.module.css';
import DialogTitleBar from './DialogTitleBar';
import Modal, { type ModalTitleSlots } from './Modal';
import styles from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onEscape?: () => boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: SheetSize;
  detail?: React.ReactNode;
  ariaDescribedBy?: string;
  fixedHeight?: boolean;
  titleSlots?: ModalTitleSlots;
  className?: string;
  bodyClassName?: string;
}

export type SheetSize = 'md' | 'lg';

export default function Sheet({
  open,
  title,
  onClose,
  onEscape,
  children,
  footer,
  size = 'md',
  detail,
  ariaDescribedBy,
  fixedHeight = false,
  titleSlots,
  className,
  bodyClassName,
}: Readonly<SheetProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragBind = useSheetDrag(dialogRef, onClose, open);

  return (
    <Modal
      open={open}
      onClose={onClose}
      onEscape={onEscape}
      ariaLabelledBy={titleId}
      ariaDescribedBy={ariaDescribedBy}
      dialogRef={dialogRef}
      className={clsx(
        styles.dialog,
        size === 'lg' && styles.dialogTall,
        fixedHeight && styles.fixedHeight,
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
            <DialogTitleBar
              titleId={titleId}
              title={title}
              detail={detail}
              onClose={onClose}
              closeAriaLabel={t('common.close')}
              leading={titleSlots?.leading}
              actions={titleSlots?.actions}
              replacement={titleSlots?.replacement}
              divided
              className={styles.titleBar}
            >
              {titleSlots?.below}
            </DialogTitleBar>
          </div>
          <div className={clsx(styles.body, bodyClassName)}>{children}</div>
          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </>
      )}
    </Modal>
  );
}
