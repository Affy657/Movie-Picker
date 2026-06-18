import { useState } from 'react';

export function useRegisterSW() {
  return {
    needRefresh: useState(false),
    offlineReady: useState(false),
    updateServiceWorker: (_reloadPage?: boolean) => Promise.resolve(),
  };
}
