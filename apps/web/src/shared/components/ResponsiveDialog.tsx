import type { ReactNode } from 'react';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import Modal, { ModalBody, ModalFooter, type ModalSize } from './Modal';
import Sheet, { type SheetSize } from './Sheet';

interface ResponsiveDialogProps {
  open: boolean;
  title: string;
  detail?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  ariaDescribedBy?: string;
  size?: ModalSize;
  sheetSize?: SheetSize;
  className?: string;
  children: ReactNode;
}

export default function ResponsiveDialog({
  open,
  title,
  detail,
  onClose,
  footer,
  ariaDescribedBy,
  size = 'sm',
  sheetSize = 'md',
  className,
  children,
}: Readonly<ResponsiveDialogProps>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet
        open={open}
        title={title}
        detail={detail}
        size={sheetSize}
        onClose={onClose}
        footer={footer}
        ariaDescribedBy={ariaDescribedBy}
        className={className}
      >
        {children}
      </Sheet>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size={size}
      column
      title={title}
      titleDetail={detail}
      ariaDescribedBy={ariaDescribedBy}
      className={className}
    >
      <ModalBody>{children}</ModalBody>
      {footer ? <ModalFooter>{footer}</ModalFooter> : null}
    </Modal>
  );
}
