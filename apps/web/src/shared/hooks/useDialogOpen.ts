import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

function landsOnBackdrop(dialog: HTMLDialogElement, event: MouseEvent): boolean {
  if (event.target !== dialog) return false;
  const box = dialog.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
}

export function useDialogOpen(
  ref: RefObject<HTMLDialogElement | null>,
  open: boolean,
  closingRef?: RefObject<boolean>
): void {
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open, ref]);

  useLayoutEffect(() => {
    const dlg = ref.current;
    return () => {
      if (!dlg?.open || !dlg.isConnected) return;
      if (closingRef) closingRef.current = true;
      dlg.close();
    };
  }, [ref, closingRef]);
}

export function useModalDialog(
  open: boolean,
  onClose: () => void,
  externalRef?: RefObject<HTMLDialogElement | null>
): RefObject<HTMLDialogElement | null> {
  const localRef = useRef<HTMLDialogElement>(null);
  const dialogRef = externalRef ?? localRef;
  const onCloseRef = useRef(onClose);
  const closingRef = useRef(false);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useDialogOpen(dialogRef, open, closingRef);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const handleClose = () => {
      if (closingRef.current) {
        closingRef.current = false;
        return;
      }
      if (open) onCloseRef.current();
    };
    let pressedOnBackdrop = false;
    const handleBackdropPress = (e: PointerEvent) => {
      pressedOnBackdrop = landsOnBackdrop(dlg, e);
    };
    const handleBackdropClick = (e: MouseEvent) => {
      const startedOnBackdrop = pressedOnBackdrop;
      pressedOnBackdrop = false;
      if (startedOnBackdrop && landsOnBackdrop(dlg, e)) onCloseRef.current();
    };
    dlg.addEventListener('close', handleClose);
    dlg.addEventListener('pointerdown', handleBackdropPress);
    dlg.addEventListener('click', handleBackdropClick);
    return () => {
      dlg.removeEventListener('close', handleClose);
      dlg.removeEventListener('pointerdown', handleBackdropPress);
      dlg.removeEventListener('click', handleBackdropClick);
    };
  }, [open, dialogRef]);

  return dialogRef;
}
