import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { MENU_ANCHOR_GAP_PX, MENU_VIEWPORT_MARGIN_PX } from '@/shared/components/menuGeometry';
import { fitMenuVertically, type MenuPlacement } from '@/shared/hooks/useMenuVerticalFit';

export type FixedPopoverPosition = {
  top: number;
  left: number;
  width: number | null;
  maxHeight: number | null;
  placement: MenuPlacement;
};

type Viewport = { width: number; height: number };

export function fixedPopoverWidth(maxWidth: number | undefined, viewportWidth: number) {
  if (maxWidth === undefined) return null;
  return Math.min(maxWidth, viewportWidth - MENU_VIEWPORT_MARGIN_PX * 2);
}

export function fixedPopoverPosition(
  anchor: Pick<DOMRect, 'top' | 'bottom' | 'left'>,
  panel: { width: number; height: number },
  viewport: Viewport,
  maxWidth?: number
): FixedPopoverPosition {
  const width = fixedPopoverWidth(maxWidth, viewport.width);
  const usedWidth = width ?? panel.width;
  const left = Math.max(
    MENU_VIEWPORT_MARGIN_PX,
    Math.min(anchor.left, viewport.width - usedWidth - MENU_VIEWPORT_MARGIN_PX)
  );
  const { placement, maxHeight } = fitMenuVertically(anchor, panel.height, viewport.height);
  const top =
    placement === 'top'
      ? Math.max(
          MENU_VIEWPORT_MARGIN_PX,
          anchor.top - MENU_ANCHOR_GAP_PX - (maxHeight ?? panel.height)
        )
      : anchor.bottom + MENU_ANCHOR_GAP_PX;
  return { top, left, width, maxHeight, placement };
}

export function fixedPopoverStyle(position: FixedPopoverPosition | null): CSSProperties {
  if (position === null) return { visibility: 'hidden' };
  const { top, left, width, maxHeight } = position;
  return {
    top,
    left,
    ...(width === null ? null : { width }),
    ...(maxHeight === null ? null : { maxHeight, overflowY: 'auto' }),
  };
}

export function useFixedPopover(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  options?: { maxWidth?: number }
): FixedPopoverPosition | null {
  const maxWidth = options?.maxWidth;
  const [position, setPosition] = useState<FixedPopoverPosition | null>(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const viewport = { width: globalThis.innerWidth, height: globalThis.innerHeight };
    const width = fixedPopoverWidth(maxWidth, viewport.width);
    if (width !== null) panel.style.width = `${width}px`;
    setPosition(
      fixedPopoverPosition(
        trigger.getBoundingClientRect(),
        { width: panel.offsetWidth, height: panel.scrollHeight },
        viewport,
        maxWidth
      )
    );
  }, [triggerRef, panelRef, maxWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    globalThis.addEventListener('resize', place);
    globalThis.addEventListener('scroll', place, true);
    return () => {
      globalThis.removeEventListener('resize', place);
      globalThis.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  return position;
}
