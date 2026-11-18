import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import IconButton from './IconButton';
import Modal from './Modal';
import Sheet from './Sheet';
import { ICON_SIZE } from './iconSize';
import styles from './ResponsiveDialog.module.css';

interface ResponsiveDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  detail?: ReactNode;
  tabs?: ReactNode;
  size?: 'sm' | 'md';
  flush?: boolean;
  sheetClassName?: string;
  modalClassName?: string;
}

function ModalBody({
  flush,
  footer,
  children,
}: Readonly<Pick<ResponsiveDialogProps, 'flush' | 'footer' | 'children'>>) {
  if (flush) {
    return (
      <>
        <div className={styles.flushBody}>{children}</div>
        {footer}
      </>
    );
  }
  return (
    <>
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </>
  );
}

export default function ResponsiveDialog({
  open,
  title,
  onClose,
  footer,
  children,
  detail,
  tabs,
  size = 'sm',
  flush = false,
  sheetClassName,
  modalClassName,
}: Readonly<ResponsiveDialogProps>) {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <Sheet
        open={open}
        title={title}
        detail={detail}
        size={size === 'md' ? 'lg' : 'md'}
        onClose={onClose}
        footer={footer}
        className={sheetClassName}
      >
        {tabs}
        {children}
      </Sheet>
    );
  }

  const body = (
    <ModalBody flush={flush} footer={footer}>
      {children}
    </ModalBody>
  );

  if (tabs) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        size={size}
        column
        ariaLabel={title}
        className={modalClassName}
      >
        <div className={styles.tabBar}>
          {tabs}
          <IconButton
            className={styles.tabBarClose}
            ariaLabel={t('common.close')}
            onClick={onClose}
          >
            <X size={ICON_SIZE.xl} aria-hidden />
          </IconButton>
        </div>
        {body}
      </Modal>
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
      className={modalClassName}
    >
      {body}
    </Modal>
  );
}
