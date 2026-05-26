import { formatRuntimeMinutes, formatTmdbVote } from './format';

describe('formatRuntimeMinutes', () => {
  it.each([
    [null, null],
    [undefined, null],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
    [0, null],
    [-10, null],
    [5, '5min'],
    [59, '59min'],
    [60, '1h'],
    [61, '1h01'],
    [90, '1h30'],
    [125, '2h05'],
    [600, '10h'],
    [125.9, '2h05'],
  ])('formatRuntimeMinutes(%p) -> %p', (input, expected) => {
    expect(formatRuntimeMinutes(input as number | null | undefined)).toBe(expected);
  });
});

describe('formatTmdbVote', () => {
  it.each([
    [null, null],
    [undefined, null],
    [Number.NaN, null],
    [0, '0.0/5'],
    [10, '5.0/5'],
    [7.6, '3.8/5'],
    [5, '2.5/5'],
    [8.4, '4.2/5'],
  ])('formatTmdbVote(%p) -> %p', (input, expected) => {
    expect(formatTmdbVote(input as number | null | undefined)).toBe(expected);
  });
});
