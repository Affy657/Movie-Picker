import { useSyncExternalStore } from 'react';

let hidden = false;
const listeners = new Set<() => void>();

export function setHomeSearchHidden(next: boolean): void {
  if (next === hidden) return;
  hidden = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): boolean {
  return hidden;
}

export function useHomeSearchHidden(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
