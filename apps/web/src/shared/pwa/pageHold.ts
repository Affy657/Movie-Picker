import { useEffect } from 'react';

type Listener = () => void;

let holders = 0;
const listeners = new Set<Listener>();

export function holdPage(): () => void {
  holders += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    if (holders === 0) [...listeners].forEach((listener) => listener());
  };
}

export function isPageHeld(): boolean {
  return holders > 0;
}

export function onPageReleased(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHoldPage(active: boolean): void {
  useEffect(() => (active ? holdPage() : undefined), [active]);
}
