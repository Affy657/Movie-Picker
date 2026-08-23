import { useLayoutEffect, useState, type RefObject } from 'react';

const VIEWPORT_MARGIN = 8;

export function useMenuHorizontalFit(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  align: 'left' | 'right' = 'right'
): number | null {
  const [left, setLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setLeft(null);
      return;
    }
    const container = containerRef.current;
    const panel = panelRef.current;
    if (!container || !panel) return;

    const compute = () => {
      const containerRect = container.getBoundingClientRect();
      const panelWidth = panel.offsetWidth;
      const naturalViewportLeft =
        align === 'right' ? containerRect.right - panelWidth : containerRect.left;
      const maxViewportLeft = Math.max(
        VIEWPORT_MARGIN,
        window.innerWidth - panelWidth - VIEWPORT_MARGIN
      );
      const clampedViewportLeft = Math.min(
        Math.max(naturalViewportLeft, VIEWPORT_MARGIN),
        maxViewportLeft
      );
      setLeft(clampedViewportLeft - containerRect.left);
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [open, containerRef, panelRef, align]);

  return left;
}
