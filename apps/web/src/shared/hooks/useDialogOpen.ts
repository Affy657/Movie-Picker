import { useEffect, useRef, type RefObject } from 'react';

export function useDialogOpen(ref: RefObject<HTMLDialogElement | null>, open: boolean): void {
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open, ref]);
}

export function useModalDialog(
  open: boolean,
  onClose: () => void,
  externalRef?: RefObject<HTMLDialogElement | null>
): RefObject<HTMLDialogElement | null> {
  const localRef = useRef<HTMLDialogElement>(null);
  const dialogRef = externalRef ?? localRef;
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useDialogOpen(dialogRef, open);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const handleClose = () => {
      if (open) onCloseRef.current();
    };
    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === dlg) onCloseRef.current();
    };
    dlg.addEventListener('close', handleClose);
    dlg.addEventListener('click', handleBackdropClick);
    return () => {
      dlg.removeEventListener('close', handleClose);
      dlg.removeEventListener('click', handleBackdropClick);
    };
  }, [open, dialogRef]);

  return dialogRef;
}
