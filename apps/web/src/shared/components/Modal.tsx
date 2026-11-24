import { useEffect, useId, useRef, type ReactElement, type ReactNode, type RefObject } from 'react';
import clsx from 'clsx';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useTranslation } from '@/shared/i18n';
import DialogTitleBar from './DialogTitleBar';
import styles from './Modal.module.css';

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE_CLASS: Record<ModalSize, string | undefined> = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
  '2xl': styles.size2xl,
};

export type ModalSurface = 'surface' | 'bare' | 'media' | 'borderless';

export type ModalFixedHeight = 'md' | 'lg';

const FIXED_HEIGHT_CLASS: Record<ModalFixedHeight, string | undefined> = {
  md: styles.fixedHeightMd,
  lg: styles.fixedHeightLg,
};

export interface ModalTitleSlots {
  leading?: ReactNode;
  actions?: ReactNode;
  replacement?: ReactNode;
  below?: ReactNode;
}

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
  onEscape?: () => boolean;
  ariaDescribedBy?: string;
  size?: ModalSize;
  surface?: ModalSurface;
  padded?: boolean;
  column?: boolean;
  anchoredTop?: boolean;
  fixedHeight?: ModalFixedHeight;
  titleSlots?: ModalTitleSlots;
  strongBackdrop?: boolean;
  closeAriaLabel?: string;
  className?: string;
  'data-testid'?: string;
  dialogRef?: RefObject<HTMLDialogElement | null>;
  children: ReactNode;
};

function useEscapeHandler(
  dialogRef: RefObject<HTMLDialogElement | null>,
  onEscape: (() => boolean) | undefined
) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (!onEscapeRef.current?.()) return;
      event.preventDefault();
      event.stopPropagation();
    };
    dialog.addEventListener('keydown', handleKeyDown);
    return () => dialog.removeEventListener('keydown', handleKeyDown);
  }, [dialogRef]);
}

export default function Modal({
  open,
  onClose,
  onEscape,
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
  fixedHeight,
  titleSlots,
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
  useEscapeHandler(dialogRef, onEscape);
  const resolvedTitleId = titleId ?? `modal-title-${reactId}`;

  return (
    <dialog
      ref={dialogRef}
      className={clsx(
        styles.dialog,
        SIZE_CLASS[size],
        surface === 'bare' && styles.bare,
        surface === 'media' && [styles.media, 'on-dark'],
        surface === 'borderless' && styles.borderless,
        padded && styles.padded,
        column && styles.column,
        anchoredTop && styles.anchoredTop,
        fixedHeight && FIXED_HEIGHT_CLASS[fixedHeight],
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
          leading={titleSlots?.leading}
          actions={titleSlots?.actions}
          replacement={titleSlots?.replacement}
          divided={column}
        >
          {titleSlots?.below}
        </DialogTitleBar>
      ) : null}
      {children}
    </dialog>
  );
}

type ModalBlockProps = Readonly<{ className?: string; children: ReactNode }>;

export function ModalBody({ className, children }: ModalBlockProps) {
  return <div className={clsx(styles.body, className)}>{children}</div>;
}

export function ModalFooter({ className, children }: ModalBlockProps) {
  return <div className={clsx(styles.footer, className)}>{children}</div>;
}

export function ModalActions({ className, children }: ModalBlockProps) {
  return <div className={clsx(styles.actions, className)}>{children}</div>;
}
