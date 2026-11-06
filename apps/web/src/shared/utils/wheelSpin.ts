import type { WinnerPickMethod } from '@/shared/types/event';

export const WHEEL_SPIN_DURATION_MS = 7500;

export function remainingWheelRevealDelayMs(
  winnerPickMethod: WinnerPickMethod | null | undefined,
  winnerPickedAt: string | null | undefined,
  nowMs = Date.now()
): number {
  if (winnerPickMethod !== 'wheel' || !winnerPickedAt) return 0;
  const pickedAt = Date.parse(winnerPickedAt);
  if (!Number.isFinite(pickedAt)) return 0;
  const remaining = pickedAt + WHEEL_SPIN_DURATION_MS - nowMs;
  return Math.min(WHEEL_SPIN_DURATION_MS, Math.max(0, remaining));
}
