import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import SpinningWheel from './SpinningWheel';
import type { MovieData } from '@/shared/types/movie';
import { randomCenteredUnit } from '@/shared/utils/random';

vi.mock('@/shared/utils/random', () => ({ randomCenteredUnit: vi.fn(() => 0) }));

type ArcCall = { radius: number; start: number; end: number };

const POINTER_ANGLE = -Math.PI / 2;
const FULL_TURN = 2 * Math.PI;

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

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
  let arcCalls: ArcCall[] = [];
  let fillTextCalls = 0;
  let drawImageCalls = 0;

  function sliceArcs(): ArcCall[] {
    const wheelRadius = Math.max(...arcCalls.map((call) => call.radius));
    return arcCalls.filter((call) => call.radius === wheelRadius);
  }

  beforeEach(() => {
    rotateCalls = [];
    arcCalls = [];
    fillTextCalls = 0;
    drawImageCalls = 0;
    vi.mocked(randomCenteredUnit).mockReturnValue(0);
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: (_x: number, _y: number, radius: number, start: number, end: number) =>
        arcCalls.push({ radius, start, end }),
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

  it('draws equal slices when no weights are given', () => {
    stubMatchMedia(true);

    render(<SpinningWheel movies={makeMovies(4)} winnerIndex={0} onDone={vi.fn()} />);

    for (const slice of sliceArcs()) {
      expect(slice.end - slice.start).toBeCloseTo(FULL_TURN / 4);
    }
  });

  it('sizes each slice in proportion to its weight', () => {
    stubMatchMedia(true);

    render(
      <SpinningWheel movies={makeMovies(3)} weights={[1, 5, 2]} winnerIndex={1} onDone={vi.fn()} />
    );

    const sweeps = sliceArcs().map((slice) => slice.end - slice.start);
    expect(sweeps).toHaveLength(3);
    expect(sweeps[0]).toBeCloseTo((FULL_TURN * 1) / 8);
    expect(sweeps[1]).toBeCloseTo((FULL_TURN * 5) / 8);
    expect(sweeps[2]).toBeCloseTo((FULL_TURN * 2) / 8);
  });

  it.each([
    { winnerIndex: 0, jitter: 0.5 },
    { winnerIndex: 0, jitter: -0.5 },
    { winnerIndex: 2, jitter: 0.5 },
    { winnerIndex: 3, jitter: -0.5 },
  ])(
    'stops with the pointer inside the narrow slice of film $winnerIndex (jitter $jitter)',
    ({ winnerIndex, jitter }) => {
      stubMatchMedia(true);
      vi.mocked(randomCenteredUnit).mockReturnValue(jitter);

      render(
        <SpinningWheel
          movies={makeMovies(4)}
          weights={[1, 9, 1, 1]}
          winnerIndex={winnerIndex}
          onDone={vi.fn()}
        />
      );

      const winnerSlice = sliceArcs()[winnerIndex]!;
      const pointerIntoSlice = positiveModulo(POINTER_ANGLE - winnerSlice.start, FULL_TURN);
      expect(pointerIntoSlice).toBeGreaterThan(0);
      expect(pointerIntoSlice).toBeLessThan(winnerSlice.end - winnerSlice.start);
    }
  );
});
