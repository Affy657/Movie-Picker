const LONGEST_DELAY_IN_SECONDS = 90;

let cooldownUntil = 0;
const listeners = new Set<() => void>();

export type RetryDelay = { unit: 'seconds' | 'minutes'; count: number };

export function retryDelayOf(ms: number): RetryDelay {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  return seconds <= LONGEST_DELAY_IN_SECONDS
    ? { unit: 'seconds', count: seconds }
    : { unit: 'minutes', count: Math.ceil(seconds / 60) };
}

export function noteRateLimit(retryAfterMs: number): void {
  const until = Date.now() + retryAfterMs;
  if (until <= cooldownUntil) return;
  cooldownUntil = until;
  for (const listener of listeners) listener();
}

export function rateLimitCooldownUntil(): number {
  return cooldownUntil;
}

export function subscribeRateLimitCooldown(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetRateLimitCooldownForTests(): void {
  cooldownUntil = 0;
}
