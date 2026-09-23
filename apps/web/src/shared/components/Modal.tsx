import { useId, type ReactElement, type ReactNode, type RefObject } from 'react';
import clsx from 'clsx';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useTranslation } from '@/shared/i18n';
import DialogTitleBar from './DialogTitleBar';
import styles from './Modal.module.css';

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | '2xl';

const SIZE_CLASS: Record<ModalSize, string | undefined> = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  '2xl': styles.size2xl,
};

export type ModalSurface = 'surface' | 'bare' | 'media' | 'borderless';

type ModalNaming =
  | {
      title: string | ReactElement;
      titleId?: string;
      titleDetail?: ReactNode;
      ariaLabelledBy?: never;
      ariaLabel?: never;
    }
  | {
      ariaLabelledBy: string;
      title?: never;
      titleId?: never;
      titleDetail?: never;
      ariaLabel?: never;
    }
  | {
      ariaLabel: string;
      title?: never;
      titleId?: never;
      titleDetail?: never;
      ariaLabelledBy?: never;
    };

type ModalProps = ModalNaming & {
  open: boolean;
  onClose: () => void;
  ariaDescribedBy?: string;
  size?: ModalSize;
  surface?: ModalSurface;
  padded?: boolean;
  column?: boolean;
  anchoredTop?: boolean;
  bottomSheetOnMobile?: boolean;
  strongBackdrop?: boolean;
  closeAriaLabel?: string;
  className?: string;
  'data-testid'?: string;
  dialogRef?: RefObject<HTMLDialogElement | null>;
  children: ReactNode;
};

export default function Modal({
  open,
  onClose,
  title,
  titleId,
  titleDetail,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaLabel,
  size = 'sm',
  surface = 'surface',
  padded = false,
  column = false,
  anchoredTop = false,
  bottomSheetOnMobile = false,
  strongBackdrop = false,
  closeAriaLabel,
  className,
  'data-testid': testId,
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
        SIZE_CLASS[size],
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
      aria-labelledby={title ? resolvedTitleId : ariaLabelledBy}
      aria-label={title || ariaLabelledBy ? undefined : ariaLabel}
      aria-describedby={ariaDescribedBy}
      data-testid={testId}
    >
      {title ? (
        <DialogTitleBar
          titleId={resolvedTitleId}
          title={title}
          detail={titleDetail}
          onClose={onClose}
          closeAriaLabel={closeAriaLabel ?? t('common.close')}
        />
      ) : null}
      {children}
    </dialog>
  );
}
