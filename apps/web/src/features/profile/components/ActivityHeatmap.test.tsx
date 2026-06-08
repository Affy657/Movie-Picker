import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ActivityHeatmap from './ActivityHeatmap';

function renderHeatmap(points: { date: string; count: number }[]) {
  return render(
    <AppTestProviders>
      <ActivityHeatmap points={points} />
    </AppTestProviders>
  );
}

describe('ActivityHeatmap', () => {
  it('ne rend rien si points est vide', () => {
    const { container } = renderHeatmap([]);
    expect(container.firstChild).toBeNull();
  });

  it('rend un élément role=img pour une liste non vide', () => {
    renderHeatmap([{ date: '2026-01-01', count: 0 }]);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('couvre tous les niveaux d intensité (0, 1, 2, 3, 4)', () => {
    const points = [
      { date: '2026-01-01', count: 0 },
      { date: '2026-01-02', count: 1 },
      { date: '2026-01-03', count: 2 },
      { date: '2026-01-04', count: 4 },
      { date: '2026-01-05', count: 6 },
    ];
    renderHeatmap(points);
    const cells = document.querySelectorAll('[class*="heatCell"]');
    expect(cells).toHaveLength(5);
  });

  it('gère une date invalide sans planter (branche isNaN)', () => {
    renderHeatmap([{ date: 'pas-une-date', count: 3 }]);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('affiche le total dans aria-label', () => {
    renderHeatmap([
      { date: '2026-01-01', count: 2 },
      { date: '2026-01-02', count: 3 },
    ]);
    expect(screen.getByRole('img', { name: '5' })).toBeInTheDocument();
  });
});
