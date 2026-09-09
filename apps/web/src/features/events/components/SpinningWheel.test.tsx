import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import SpinningWheel, { WHEEL_SEGMENT_COLORS } from './SpinningWheel';
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

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastWithWhite(hex: string): number {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}

describe('SpinningWheel', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  let rotateCalls: number[] = [];

  beforeEach(() => {
    rotateCalls = [];
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

  it('chaque couleur de segment garde un libelle blanc lisible (AA)', () => {
    expect(WHEEL_SEGMENT_COLORS).not.toHaveLength(0);
    for (const color of WHEEL_SEGMENT_COLORS) {
      expect(contrastWithWhite(color)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('aucun libelle n’est dessine a l’envers, quel que soit le nombre de films', () => {
    stubMatchMedia(true);

    render(<SpinningWheel movies={makeMovies(22)} winnerIndex={7} onDone={vi.fn()} />);

    expect(rotateCalls).toHaveLength(22);
    for (const angle of rotateCalls) {
      expect(Math.cos(angle)).toBeGreaterThan(-1e-9);
    }
  });
});
