import { useEffect, useRef } from 'react';
import { setEventPresence } from '@/features/events/api/eventsApi';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';

export const PROPOSING_REFRESH_MS = 10_000;

function signal(slug: string, proposing: boolean): void {
  setEventPresence(slug, proposing).catch(() => undefined);
}

export function useProposingPresence({
  slug,
  active,
}: {
  slug: string | undefined;
  active: boolean;
}): void {
  const online = useOnlineStatus();
  const announced = useRef<string | null>(null);
  const proposing = active && online && !!slug;

  useEffect(() => {
    if (!proposing || !slug) return;
    announced.current = slug;
    signal(slug, true);
    const refresh = globalThis.setInterval(() => signal(slug, true), PROPOSING_REFRESH_MS);
    return () => {
      globalThis.clearInterval(refresh);
      if (announced.current === slug) {
        announced.current = null;
        signal(slug, false);
      }
    };
  }, [proposing, slug]);
}
