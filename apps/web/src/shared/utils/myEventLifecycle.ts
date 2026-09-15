import type { MyEventLifecycle } from '@/shared/types/event';

export function isMyEventLifecycle(v: string): v is MyEventLifecycle {
  return v === 'upcoming' || v === 'live' || v === 'pending' || v === 'finished';
}

export function normalizeMyEventLifecycle(v: string | undefined): MyEventLifecycle {
  if (v && isMyEventLifecycle(v)) return v;
  return 'finished';
}
