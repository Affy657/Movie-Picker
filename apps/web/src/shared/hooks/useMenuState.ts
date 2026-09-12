import { useCallback, useId, useRef, useState } from 'react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useMenuFocus } from '@/shared/hooks/useMenuFocus';
import { useMenuHorizontalFit } from '@/shared/hooks/useMenuHorizontalFit';

export function useMenuState() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  useClickOutside(containerRef, close, open);
  useMenuFocus(open, panelRef, triggerRef);
  const fitLeft = useMenuHorizontalFit(open, containerRef, panelRef);

  return {
    open,
    close,
    containerRef,
    triggerProps: {
      ref: triggerRef,
      onClick: toggle,
      'aria-haspopup': 'menu' as const,
      'aria-expanded': open,
      'aria-controls': open ? menuId : undefined,
    },
    panelProps: {
      ref: panelRef,
      id: menuId,
      style: fitLeft !== null ? { left: fitLeft, right: 'auto' } : undefined,
    },
  };
}
