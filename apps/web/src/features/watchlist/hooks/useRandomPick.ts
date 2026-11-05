import { useCallback, useEffect, useState } from 'react';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import {
  EMPTY_PICK,
  drawNext,
  shuffleFrames,
  type PickIndex,
  type RandomPickState,
} from '@/features/watchlist/utils/randomPick';

const FRAME_DELAYS_MS = [0, 70, 70, 80, 90, 100, 120, 140, 170, 210];
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface Draw {
  pick: RandomPickState;
  frames: readonly (string | null)[];
  step: number;
}

function timeline(
  keys: readonly string[],
  previous: string | null,
  winner: string | null,
  animate: boolean,
  pickIndex: PickIndex
): (string | null)[] {
  if (!animate || winner === null) return [];
  return [
    previous,
    ...shuffleFrames(keys, previous, winner, FRAME_DELAYS_MS.length - 1, pickIndex),
  ];
}

export function useRandomPick(keys: readonly string[], pickIndex: PickIndex) {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const animate = keys.length > 1 && !reducedMotion;
  const [draw, setDraw] = useState<Draw>(() => {
    const pick = drawNext(keys, EMPTY_PICK, pickIndex);
    return { pick, frames: timeline(keys, null, pick.current, animate, pickIndex), step: 0 };
  });

  useEffect(() => {
    if (draw.frames.length === 0) return;
    let elapsed = 0;
    const timers = FRAME_DELAYS_MS.map((delay, index) => {
      elapsed += delay;
      return globalThis.setTimeout(
        () => setDraw((current) => ({ ...current, step: index + 1 })),
        elapsed
      );
    });
    return () => timers.forEach((timer) => globalThis.clearTimeout(timer));
  }, [draw.frames]);

  const drawAgain = useCallback(() => {
    setDraw((current) => {
      if (current.step < current.frames.length) return current;
      const pick = drawNext(keys, current.pick, pickIndex);
      return {
        pick,
        frames: timeline(keys, current.pick.current, pick.current, animate, pickIndex),
        step: 0,
      };
    });
  }, [keys, pickIndex, animate]);

  const shuffling = draw.step < draw.frames.length;
  return {
    current: draw.pick.current,
    shown: shuffling ? (draw.frames[draw.step] ?? null) : draw.pick.current,
    shuffling,
    canDrawAgain: keys.length > 1,
    drawAgain,
  };
}
