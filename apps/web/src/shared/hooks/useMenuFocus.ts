import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useMenuFocus(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panel).focus();

    const returnFocusOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') triggerRef.current?.focus();
    };
    document.addEventListener('keydown', returnFocusOnEscape);
    return () => document.removeEventListener('keydown', returnFocusOnEscape);
  }, [open, panelRef, triggerRef]);
}
