import type { KeyboardEvent } from 'react';

export const SEARCH_RESULT_ATTRIBUTE = 'data-search-result';

export function moveThroughResults(event: KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const box = event.currentTarget;
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
