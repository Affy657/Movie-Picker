import { useLayoutEffect, useState, type RefObject } from 'react';
import { MENU_ANCHOR_GAP_PX, MENU_VIEWPORT_MARGIN_PX } from '@/shared/components/menuGeometry';

export type MenuPlacement = 'bottom' | 'top';

export type MenuVerticalFit = {
  placement: MenuPlacement;
  maxHeight: number | null;
};

const FITS_BELOW: MenuVerticalFit = { placement: 'bottom', maxHeight: null };

export function fitMenuVertically(
  anchor: Pick<DOMRect, 'top' | 'bottom'>,
  panelHeight: number,
  viewportHeight: number
): MenuVerticalFit {
  const roomBelow = viewportHeight - anchor.bottom - MENU_ANCHOR_GAP_PX - MENU_VIEWPORT_MARGIN_PX;
  const roomAbove = anchor.top - MENU_ANCHOR_GAP_PX - MENU_VIEWPORT_MARGIN_PX;
  if (panelHeight <= roomBelow) return FITS_BELOW;
  if (roomAbove > roomBelow) {
    return { placement: 'top', maxHeight: panelHeight <= roomAbove ? null : roomAbove };
  }
  return { placement: 'bottom', maxHeight: roomBelow };
}

function sameFit(a: MenuVerticalFit, b: MenuVerticalFit): boolean {
  return a.placement === b.placement && a.maxHeight === b.maxHeight;
}

export function useMenuVerticalFit(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>
): MenuVerticalFit {
  const [fit, setFit] = useState<MenuVerticalFit>(FITS_BELOW);

  useLayoutEffect(() => {
    if (!open) {
      setFit(FITS_BELOW);
      return;
    }
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const compute = () => {
      const next = fitMenuVertically(
        anchor.getBoundingClientRect(),
        panel.scrollHeight,
        globalThis.innerHeight
      );
      setFit((current) => (sameFit(current, next) ? current : next));
    };

    compute();
    globalThis.addEventListener('resize', compute);
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => compute());
    observer?.observe(panel);
    return () => {
      globalThis.removeEventListener('resize', compute);
      observer?.disconnect();
    };
  }, [open, anchorRef, panelRef]);

  return fit;
}
