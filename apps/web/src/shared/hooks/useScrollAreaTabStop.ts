import { useEffect, type RefObject } from 'react';

export function useScrollAreaTabStop(
  areaRef: RefObject<HTMLElement | null>,
  scrolls: boolean
): void {
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    if (scrolls) area.tabIndex = 0;
    else area.removeAttribute('tabindex');
  }, [areaRef, scrolls]);
}
