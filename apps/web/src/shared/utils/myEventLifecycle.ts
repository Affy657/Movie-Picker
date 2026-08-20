import type { MyEventLifecycle } from '@/shared/types/event';

const LABELS: Record<MyEventLifecycle, string> = {
  upcoming: 'À venir',
  live: 'En cours',
  pending: 'En suspens',
  finished: 'Terminée',
};

export function myEventLifecycleLabel(l: MyEventLifecycle): string {
  return LABELS[l] ?? l;
}

export function isMyEventLifecycle(v: string): v is MyEventLifecycle {
  return v === 'upcoming' || v === 'live' || v === 'pending' || v === 'finished';
}

export function normalizeMyEventLifecycle(v: string | undefined): MyEventLifecycle {
  if (v && isMyEventLifecycle(v)) return v;
  return 'finished';
}
