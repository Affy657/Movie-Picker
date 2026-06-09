import { useEffect } from 'react';

export function useDialogOpen(ref: React.RefObject<HTMLDialogElement | null>, open: boolean): void {
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open, ref]);
}
