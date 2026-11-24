import type { ReactNode } from 'react';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import Modal, {
  ModalBody,
  ModalFooter,
  type ModalFixedHeight,
  type ModalSize,
  type ModalTitleSlots,
} from './Modal';
import Sheet, { type SheetSize } from './Sheet';

interface ResponsiveDialogProps {
  open: boolean;
  title: string;
  detail?: ReactNode;
  onClose: () => void;
  onEscape?: () => boolean;
  footer?: ReactNode;
  ariaDescribedBy?: string;
  size?: ModalSize;
  sheetSize?: SheetSize;
  fixedHeight?: ModalFixedHeight;
  leading?: ReactNode;
  headerActions?: ReactNode;
  headerReplacement?: ReactNode;
  tabs?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export default function ResponsiveDialog({
  open,
  title,
  detail,
  onClose,
  onEscape,
  footer,
  ariaDescribedBy,
  size = 'sm',
  sheetSize = 'md',
  fixedHeight,
  leading,
  headerActions,
  headerReplacement,
  tabs,
  className,
  bodyClassName,
  children,
}: Readonly<ResponsiveDialogProps>) {
  const isMobile = useIsMobile();
  const titleSlots: ModalTitleSlots = {
    leading,
    actions: headerActions,
    replacement: headerReplacement,
    below: tabs,
  };

  if (isMobile) {
    return (
      <Sheet
        open={open}
        title={title}
        detail={detail}
        size={sheetSize}
        onClose={onClose}
        onEscape={onEscape}
        footer={footer}
        ariaDescribedBy={ariaDescribedBy}
        fixedHeight={fixedHeight !== undefined}
        titleSlots={titleSlots}
        className={className}
        bodyClassName={bodyClassName}
      >
        {children}
      </Sheet>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      onEscape={onEscape}
      size={size}
      column
      fixedHeight={fixedHeight}
      title={title}
      titleDetail={detail}
      titleSlots={titleSlots}
      ariaDescribedBy={ariaDescribedBy}
      className={className}
    >
      <ModalBody className={bodyClassName}>{children}</ModalBody>
      {footer ? <ModalFooter>{footer}</ModalFooter> : null}
    </Modal>
  );
}
