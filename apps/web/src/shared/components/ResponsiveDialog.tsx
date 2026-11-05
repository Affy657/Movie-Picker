import type { ReactNode } from 'react';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import Modal from './Modal';
import Sheet from './Sheet';
import styles from './ResponsiveDialog.module.css';

interface ResponsiveDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export default function ResponsiveDialog({
  open,
  title,
  onClose,
  footer,
  children,
}: Readonly<ResponsiveDialogProps>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} title={title} onClose={onClose} footer={footer}>
        {children}
      </Sheet>
    );
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" column title={title}>
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </Modal>
  );
}
