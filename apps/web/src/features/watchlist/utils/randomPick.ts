export interface RandomPickState {
  readonly current: string | null;
  readonly drawn: readonly string[];
}

export const EMPTY_PICK: RandomPickState = { current: null, drawn: [] };

export type PickIndex = (length: number) => number;

function pickOne(options: readonly string[], pickIndex: PickIndex): string | undefined {
  return options.length === 0 ? undefined : options[pickIndex(options.length)];
}

export function drawNext(
  keys: readonly string[],
  state: RandomPickState,
  pickIndex: PickIndex
): RandomPickState {
  const drawn = new Set(state.drawn);
  const remaining = keys.filter((key) => !drawn.has(key));
  if (remaining.length > 0) {
    const pick = pickOne(remaining, pickIndex);
    return pick === undefined ? state : { current: pick, drawn: [...state.drawn, pick] };
  }
  const others = keys.filter((key) => key !== state.current);
  const pick = pickOne(others.length > 0 ? others : keys, pickIndex);
  return pick === undefined ? state : { current: pick, drawn: [pick] };
}

export function shuffleFrames(
  keys: readonly string[],
  previous: string | null,
  winner: string,
  count: number,
  pickIndex: PickIndex
): string[] {
  const losers = keys.filter((key) => key !== winner);
  const frames: string[] = [];
  let last = previous;
  for (let i = 0; i < count; i++) {
    const fresh = losers.filter((key) => key !== last);
    const next = pickOne(fresh.length > 0 ? fresh : losers, pickIndex);
    if (next === undefined) break;
    frames.push(next);
    last = next;
  }
  return frames;
}
