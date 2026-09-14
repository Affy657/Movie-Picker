import { useEffect, useRef } from 'react';

type ChunkLoader = () => Promise<unknown>;

const IDLE_FALLBACK_DELAY_MS = 2000;

export function useIdlePrefetch(loaders: ReadonlyArray<ChunkLoader>): void {
  const loadersRef = useRef(loaders);
  loadersRef.current = loaders;

  useEffect(() => {
    const prefetch = (): void => {
      for (const load of loadersRef.current) load().catch(() => undefined);
    };
    if (typeof requestIdleCallback === 'function' && typeof cancelIdleCallback === 'function') {
      const cancel = cancelIdleCallback;
      const handle = requestIdleCallback(prefetch);
      return () => cancel(handle);
    }
    const timeout = setTimeout(prefetch, IDLE_FALLBACK_DELAY_MS);
    return () => clearTimeout(timeout);
  }, []);
}
