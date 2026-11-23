import { useCallback, useEffect, useState } from 'react';
import { rateLimitCooldownUntil, subscribeRateLimitCooldown } from '@/shared/api/rateLimitCooldown';

const TICK_MS = 1000;

function remainingCooldownMs(): number {
  return Math.max(0, rateLimitCooldownUntil() - Date.now());
}

export function useRateLimitCooldownMs(): number {
  const [remainingMs, setRemainingMs] = useState(remainingCooldownMs);
  const refresh = useCallback(() => setRemainingMs(remainingCooldownMs()), []);
  const coolingDown = remainingMs > 0;

  useEffect(() => subscribeRateLimitCooldown(refresh), [refresh]);

  useEffect(() => {
    if (!coolingDown) return;
    const timer = setInterval(refresh, TICK_MS);
    return () => clearInterval(timer);
  }, [coolingDown, refresh]);

  return remainingMs;
}
