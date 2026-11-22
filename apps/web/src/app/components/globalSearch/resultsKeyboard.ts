import { useEffect, type RefObject } from 'react';

export const SEARCH_RESULT_ATTRIBUTE = 'data-search-result';

function moveThroughResults(box: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const results = Array.from(box.querySelectorAll<HTMLElement>(`[${SEARCH_RESULT_ATTRIBUTE}]`));
  if (results.length === 0) return;
  event.preventDefault();
  const current = results.indexOf(document.activeElement as HTMLElement);
  if (event.key === 'ArrowDown') {
    results[Math.min(current + 1, results.length - 1)]?.focus();
    return;
  }
  if (current > 0) {
    results[current - 1]?.focus();
    return;
  }
  box.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
}

export function useResultsKeyboard(boxRef: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const box = boxRef.current;
    if (!enabled || !box) return;
    const onKeyDown = (event: KeyboardEvent) => moveThroughResults(box, event);
    box.addEventListener('keydown', onKeyDown);
    return () => box.removeEventListener('keydown', onKeyDown);
  }, [boxRef, enabled]);
}
