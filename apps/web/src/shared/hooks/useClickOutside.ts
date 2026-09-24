import { useEffect, useRef, type RefObject } from 'react';

type ElementRef = RefObject<HTMLElement | null>;

type ClickOutsideOptions = {
  ignoreSelector?: string;
  returnFocusTo?: ElementRef;
};

function isInside(refs: readonly ElementRef[], target: Node): boolean {
  return refs.some((ref) => ref.current?.contains(target));
}

function isInForeignDialog(refs: readonly ElementRef[], target: Element): boolean {
  const dialog = target.closest('dialog[open]');
  if (!dialog) return false;
  return !refs.some((ref) => ref.current && dialog.contains(ref.current));
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
      if (event.target instanceof Element && isInForeignDialog(watched(), event.target)) return;
      event.preventDefault();
      onCloseRef.current();
      returnFocusTo?.current?.focus();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [enabled, ignoreSelector, returnFocusTo]);
}
