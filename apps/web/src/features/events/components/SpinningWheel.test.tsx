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
  let rotateCalls: number[] = [];
  let fillTextCalls = 0;
  let drawImageCalls = 0;

  beforeEach(() => {
    rotateCalls = [];
    fillTextCalls = 0;
    drawImageCalls = 0;
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
      rotate: (angle: number) => rotateCalls.push(angle),
      scale: vi.fn(),
      fillText: () => {
        fillTextCalls++;
      },
      drawImage: () => {
        drawImageCalls++;
      },
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

  it('aucun libelle n’est dessine a l’envers, quel que soit le nombre de films', () => {
    stubMatchMedia(true);

    render(<SpinningWheel movies={makeMovies(22)} winnerIndex={7} onDone={vi.fn()} />);

    const discRotations = 1;
    expect(rotateCalls).toHaveLength(22 + discRotations);
    for (const angle of rotateCalls) {
      expect(Math.cos(angle)).toBeGreaterThan(-1e-9);
    }
  });

  it('draws the labels once then spins the disc frame by frame', async () => {
    stubMatchMedia(false);
    const frames: Array<FrameRequestCallback> = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    render(<SpinningWheel movies={makeMovies(6)} winnerIndex={2} onDone={vi.fn()} />);
    frames.shift()!(0);
    frames.shift()!(100);
    frames.shift()!(200);

    const framesDrawn = 4;
    const layersPerFrame = 2;
    expect(fillTextCalls).toBe(6);
    expect(drawImageCalls).toBe(framesDrawn * layersPerFrame);
  });
});
