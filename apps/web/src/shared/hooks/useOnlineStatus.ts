import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';

function subscribe(listener: () => void): () => void {
  return onlineManager.subscribe(listener);
}

function isOnline(): boolean {
  return onlineManager.isOnline();
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, isOnline, () => true);
}
