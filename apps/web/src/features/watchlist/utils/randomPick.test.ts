import { describe, expect, it } from 'vitest';
import { EMPTY_PICK, drawNext, shuffleFrames, type RandomPickState } from './randomPick';

function indices(...values: number[]): (length: number) => number {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
}

function drawMany(keys: readonly string[], times: number, pickIndex: (length: number) => number) {
  const picks: string[] = [];
  let state: RandomPickState = EMPTY_PICK;
  for (let i = 0; i < times; i++) {
    state = drawNext(keys, state, pickIndex);
    picks.push(state.current ?? '');
  }
  return { picks, state };
}

describe('drawNext', () => {
  it('draws every title once before any title comes back', () => {
    const keys = ['a', 'b', 'c', 'd'];

    const { picks } = drawMany(keys, 4, indices(3, 0, 1, 0));

    expect([...picks].sort()).toEqual(keys);
  });

  it('starts a new round without the title on screen once every title was drawn', () => {
    const keys = ['a', 'b', 'c'];
    const { state } = drawMany(keys, 3, indices(0));

    const next = drawNext(keys, state, indices(0));

    expect(state.current).toBe('c');
    expect(next.current).not.toBe('c');
    expect(next.drawn).toEqual([next.current]);
  });

  it('draws the only title again and again', () => {
    const { picks } = drawMany(['a'], 3, indices(0));

    expect(picks).toEqual(['a', 'a', 'a']);
  });

  it('keeps the state when there is nothing to draw', () => {
    expect(drawNext([], EMPTY_PICK, indices(0))).toBe(EMPTY_PICK);
  });
});

describe('shuffleFrames', () => {
  it('never shows the winner nor the same title twice in a row before the end', () => {
    const frames = shuffleFrames(['a', 'b', 'c', 'd'], 'a', 'd', 8, indices(0, 1, 1));

    expect(frames).toHaveLength(8);
    expect(frames).not.toContain('d');
    expect(frames[0]).not.toBe('a');
    frames.slice(1).forEach((frame, index) => expect(frame).not.toBe(frames[index]));
  });

  it('shows the other title when there are only two', () => {
    expect(shuffleFrames(['a', 'b'], null, 'b', 3, indices(0))).toEqual(['a', 'a', 'a']);
  });

  it('has nothing to shuffle with a single title', () => {
    expect(shuffleFrames(['a'], null, 'a', 8, indices(0))).toEqual([]);
  });
});
