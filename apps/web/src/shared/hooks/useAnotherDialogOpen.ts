import { useEffect, useState, type RefObject } from 'react';

function anotherDialogOpen(own: HTMLDialogElement | null): boolean {
  return [...document.querySelectorAll('dialog[open]')].some((dialog) => dialog !== own);
}

export function useAnotherDialogOpen(ownRef: RefObject<HTMLDialogElement | null>): boolean {
  const [open, setOpen] = useState(() => anotherDialogOpen(ownRef.current));

  useEffect(() => {
    const update = () => setOpen(anotherDialogOpen(ownRef.current));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    return () => observer.disconnect();
  }, [ownRef]);

  return open;
}
