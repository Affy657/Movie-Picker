import { describe, it, expect } from 'vitest';
import sharedCases from '../../../../../api-dotnet/MoviePicker.Api.Tests/Domain/wheel-slice-weights.json?raw';
import type { WheelMode } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import { wheelSliceWeights } from './wheelSliceWeights';

type SharedCase = { mode: WheelMode; scores: number[]; weights: number[] };

const { cases } = JSON.parse(sharedCases) as { cases: SharedCase[] };

function movieWithScore(score: number): MovieData {
  return { id: `m${score}`, title: 'Film', score } as MovieData;
}

describe('wheelSliceWeights', () => {
  it.each(cases)(
    'draws $mode slices for scores $scores as WheelWinnerPicker weighs them',
    ({ mode, scores, weights }) => {
      expect(wheelSliceWeights(scores.map(movieWithScore), mode)).toEqual(weights);
    }
  );

  it('gives every film the same slice in strict random mode, whatever the votes', () => {
    const movies = [movieWithScore(4), movieWithScore(0), movieWithScore(-2)];

    expect(wheelSliceWeights(movies, 'strictRandom')).toEqual([1, 1, 1]);
  });

  it('weighs each film like the server draw does: one plus its net score', () => {
    const movies = [movieWithScore(4), movieWithScore(0), movieWithScore(1)];

    expect(wheelSliceWeights(movies, 'weightedByVotes')).toEqual([5, 1, 2]);
  });

  it('keeps a minimum slice for a film voted down, as the server keeps it in the draw', () => {
    const movies = [movieWithScore(-3), movieWithScore(-1)];

    expect(wheelSliceWeights(movies, 'weightedByVotes')).toEqual([1, 1]);
  });

  it('falls back to the minimum slice when a film comes without its score', () => {
    const movies = [{ id: 'm1', title: 'Film' } as MovieData];

    expect(wheelSliceWeights(movies, 'weightedByVotes')).toEqual([1]);
  });
});
