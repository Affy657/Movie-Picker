import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import SpinningWheel from './SpinningWheel';
import type { MovieData } from '@/shared/types/movie';

function makeMovies(n: number): MovieData[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    eventId: 'e1',
    participantId: 'p1',
    tmdbId: i + 1,
    title: `Film ${i + 1}`,
    year: '2024',
    posterPath: null,
    proposerPseudo: 'Alice',
    score: 0,
    up: 0,
    down: 0,
  }));
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );
}

describe('SpinningWheel', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      fillText: vi.fn(),
      measureText: () => ({ width: 0 }),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    vi.unstubAllGlobals();
  });

  it('respecte prefers-reduced-motion : ne joue pas le tirage anime et termine directement', async () => {
    stubMatchMedia(true);
    const onDone = vi.fn();

    render(<SpinningWheel movies={makeMovies(3)} winnerIndex={1} onDone={onDone} />);

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('sans preference reduced-motion : n’appelle pas onDone immediatement', () => {
    stubMatchMedia(false);
    const onDone = vi.fn();

    render(<SpinningWheel movies={makeMovies(3)} winnerIndex={1} onDone={onDone} />);

    expect(onDone).not.toHaveBeenCalled();
  });
});
