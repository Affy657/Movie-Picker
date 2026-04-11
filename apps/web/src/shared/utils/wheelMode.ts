import type { WheelMode } from '@/shared/types/event';

const WHEEL_MODES: WheelMode[] = ['strictRandom', 'weightedByVotes'];

export function isWheelMode(value: string): value is WheelMode {
  return (WHEEL_MODES as string[]).includes(value);
}
