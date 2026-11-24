import { startTransition, useEffect, useState } from 'react';

const IDLE_FALLBACK_MS = 200;

export function useAfterIdle(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const show = () => startTransition(() => setReady(true));
    if (typeof requestIdleCallback === 'function' && typeof cancelIdleCallback === 'function') {
      const cancel = cancelIdleCallback;
      const handle = requestIdleCallback(show);
      return () => cancel(handle);
    }
    const timer = setTimeout(show, IDLE_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);
  return ready;
}
