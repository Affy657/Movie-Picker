import { useEffect, useRef } from 'react';

export function useDialogOpen(ref: React.RefObject<HTMLDialogElement | null>, open: boolean): void {
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open, ref]);
}

export function useModalDialog(
  open: boolean,
  onClose: () => void
): React.RefObject<HTMLDialogElement | null> {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useDialogOpen(dialogRef, open);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    // Deps sur `open` : le listener doit etre retire avant que l'effet de
    // useDialogOpen n'appelle dlg.close() ci-dessus, sinon la fermeture native
    // qu'il declenche synchronement rappelle onClose une seconde fois alors
    // que le parent a deja traite la fermeture (cf. ConfirmDialog).
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
  }, [open]);

  return dialogRef;
}
