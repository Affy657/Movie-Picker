import { useCallback, useEffect, useState, type RefObject } from 'react';

const EDGE_TOLERANCE = 2;

export interface RailScrollState {
  canScrollBack: boolean;
  canScrollForward: boolean;
}

export interface RailScroll extends RailScrollState {
  scrollByPage: (direction: -1 | 1) => void;
}

export function useRailScroll(
  railRef: RefObject<HTMLElement | null>,
  itemCount: number
): RailScroll {
  const [state, setState] = useState<RailScrollState>({
    canScrollBack: false,
    canScrollForward: false,
  });

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const readScrollState = () => {
      const maxScroll = rail.scrollWidth - rail.clientWidth;
      const offset = Math.abs(rail.scrollLeft);
      setState({
        canScrollBack: offset > EDGE_TOLERANCE,
        canScrollForward: maxScroll - offset > EDGE_TOLERANCE,
      });
    };

    readScrollState();
    rail.addEventListener('scroll', readScrollState, { passive: true });

    if (typeof ResizeObserver === 'undefined') {
      return () => rail.removeEventListener('scroll', readScrollState);
    }

    const observer = new ResizeObserver(readScrollState);
    observer.observe(rail);
    return () => {
      rail.removeEventListener('scroll', readScrollState);
      observer.disconnect();
    };
  }, [railRef, itemCount]);

  const scrollByPage = useCallback(
    (direction: -1 | 1) => {
      const rail = railRef.current;
      if (!rail) return;
      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      rail.scrollBy({
        left: direction * Math.max(rail.clientWidth * 0.8, 1),
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    },
    [railRef]
  );

  return { ...state, scrollByPage };
}
