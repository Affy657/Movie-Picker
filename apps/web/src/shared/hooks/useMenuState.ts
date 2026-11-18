import { useCallback, useId, useRef, useState, type CSSProperties } from 'react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useMenuFocus } from '@/shared/hooks/useMenuFocus';
import { useMenuHorizontalFit } from '@/shared/hooks/useMenuHorizontalFit';
import {
  useMenuVerticalFit,
  type MenuPlacementPreference,
} from '@/shared/hooks/useMenuVerticalFit';

function panelStyle(left: number | null, maxHeight: number | null): CSSProperties | undefined {
  if (left === null && maxHeight === null) return undefined;
  return {
    ...(left === null ? null : { left, right: 'auto' }),
    ...(maxHeight === null ? null : { maxHeight, overflowY: 'auto' }),
  };
}

export function useMenuState(options?: {
  align?: 'left' | 'right';
  placement?: MenuPlacementPreference;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const dismiss = useCallback(() => setOpen(false), []);
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  useClickOutside(containerRef, dismiss, open, { closeOnFocusLeave: true });
  useMenuFocus(open, panelRef, triggerRef);
  const fitLeft = useMenuHorizontalFit(open, containerRef, panelRef, options?.align);
  const { placement, maxHeight } = useMenuVerticalFit(
    open,
    containerRef,
    panelRef,
    options?.placement
  );

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
      'data-placement': placement,
      style: panelStyle(fitLeft, maxHeight),
    },
  };
}
