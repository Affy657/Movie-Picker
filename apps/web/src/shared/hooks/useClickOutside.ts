import { useEffect, useRef, type RefObject } from 'react';

type ElementRef = RefObject<HTMLElement | null>;

type ClickOutsideOptions = {
  ignoreSelector?: string;
  returnFocusTo?: ElementRef;
};

function isInside(refs: readonly ElementRef[], target: Node): boolean {
  return refs.some((ref) => ref.current?.contains(target));
}

function holdsThePopover(dialog: Element, refs: readonly ElementRef[]): boolean {
  return refs.some((ref) => ref.current && dialog.contains(ref.current));
}

function isInForeignDialog(refs: readonly ElementRef[], target: Element): boolean {
  const dialog = target.closest('dialog[open]');
  return dialog !== null && !holdsThePopover(dialog, refs);
}

function escapeBelongsToADialog(refs: readonly ElementRef[], target: EventTarget | null): boolean {
  if (target instanceof Element && target.closest('dialog[open]'))
    return isInForeignDialog(refs, target);
  return Array.from(document.querySelectorAll('dialog[open]')).some(
    (dialog) => !holdsThePopover(dialog, refs)
  );
}

function focusIsInside(refs: readonly ElementRef[]): boolean {
  const active = document.activeElement;
  return !active || active === document.body || isInside(refs, active);
}

export function useClickOutside(
  refs: ElementRef | readonly ElementRef[],
  onClose: () => void,
  enabled: boolean,
  { ignoreSelector, returnFocusTo }: ClickOutsideOptions = {}
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const refsRef = useRef(refs);
  refsRef.current = refs;

  useEffect(() => {
    if (!enabled) return;
    const watched = (): readonly ElementRef[] => {
      const current = refsRef.current;
      return 'current' in current ? [current] : current;
    };
    const handlePointer = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const list = watched();
      if (isInside(list, target)) return;
      if (ignoreSelector && target.closest(ignoreSelector)) return;
      if (isInForeignDialog(list, target)) return;
      onCloseRef.current();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const list = watched();
      if (escapeBelongsToADialog(list, event.target)) return;
      event.preventDefault();
      const giveFocusBack = focusIsInside(list);
      onCloseRef.current();
      if (giveFocusBack) returnFocusTo?.current?.focus();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [enabled, ignoreSelector, returnFocusTo]);
}
