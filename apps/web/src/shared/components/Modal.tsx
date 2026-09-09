import { useId, type ReactNode, type RefObject } from 'react';
import clsx from 'clsx';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useTranslation } from '@/shared/i18n';
import DialogTitleBar from './DialogTitleBar';
import styles from './Modal.module.css';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export type ModalSurface = 'surface' | 'bare' | 'media' | 'borderless';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  titleId?: string;
  labelledBy?: string;
  describedBy?: string;
  ariaLabel?: string;
  size?: ModalSize;
  surface?: ModalSurface;
  padded?: boolean;
  column?: boolean;
  anchoredTop?: boolean;
  bottomSheetOnMobile?: boolean;
  strongBackdrop?: boolean;
  closeLabel?: string;
  className?: string;
  testId?: string;
  dialogRef?: RefObject<HTMLDialogElement | null>;
  children: ReactNode;
};

export default function Modal({
  open,
  onClose,
  title,
  titleId,
  labelledBy,
  describedBy,
  ariaLabel,
  size = 'md',
  surface = 'surface',
  padded = false,
  column = false,
  anchoredTop = false,
  bottomSheetOnMobile = false,
  strongBackdrop = false,
  closeLabel,
  className,
  testId,
  dialogRef: externalRef,
  children,
}: Readonly<ModalProps>) {
  const { t } = useTranslation();
  const reactId = useId();
  const dialogRef = useModalDialog(open, onClose, externalRef);
  const resolvedTitleId = titleId ?? `modal-title-${reactId}`;

  return (
    <dialog
      ref={dialogRef}
      className={clsx(
        styles.dialog,
        styles[size],
        surface === 'bare' && styles.bare,
        surface === 'media' && styles.media,
        surface === 'borderless' && styles.borderless,
        padded && styles.padded,
        column && styles.column,
        anchoredTop && styles.anchoredTop,
        bottomSheetOnMobile && styles.bottomSheet,
        strongBackdrop && styles.strongBackdrop,
        className
      )}
      aria-labelledby={title ? resolvedTitleId : labelledBy}
      aria-label={title || labelledBy ? undefined : ariaLabel}
      aria-describedby={describedBy}
      data-testid={testId}
    >
      {title ? (
        <DialogTitleBar
          titleId={resolvedTitleId}
          title={title}
          onClose={onClose}
          closeLabel={closeLabel ?? t('common.close')}
        />
      ) : null}
      {children}
    </dialog>
  );
}
