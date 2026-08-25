import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ActivityWeeks from './ActivityWeeks';

function renderWeeks(points: { date: string; count: number }[]) {
  return render(
    <AppTestProviders>
      <ActivityWeeks points={points} />
    </AppTestProviders>
  );
}

function days(counts: number[], startDate: string): { date: string; count: number }[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  return counts.map((count, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), count };
  });
}

describe('ActivityWeeks', () => {
  it('ne rend rien si points est vide', () => {
    const { container } = renderWeeks([]);
    expect(container.firstChild).toBeNull();
  });

  it('rend un groupe et une cellule accessible pour une liste non vide', () => {
    renderWeeks([{ date: '2026-01-01', count: 0 }]);
    expect(screen.getByRole('group')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('agrège les jours en une cellule par semaine, chacune focusable au clavier', () => {
    const points = days(new Array(21).fill(0), '2026-01-05');
    renderWeeks(points);
    const cells = screen.getAllByRole('button');
    expect(cells).toHaveLength(3);
    cells.forEach((cell) => expect(cell).toBeInstanceOf(HTMLButtonElement));
  });

  it('gère une date invalide sans planter (branche isNaN)', () => {
    renderWeeks([{ date: 'pas-une-date', count: 3 }]);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('affiche le total dans le libellé du groupe', () => {
    renderWeeks([
      { date: '2026-01-01', count: 2 },
      { date: '2026-01-02', count: 3 },
    ]);
    expect(screen.getByRole('group', { name: /5 participation/ })).toBeInTheDocument();
  });

  it('affiche une légende avec 4 niveaux', () => {
    renderWeeks(days(new Array(7).fill(1), '2026-01-05'));
    expect(document.querySelectorAll('[class*="legendSwatch"]')).toHaveLength(4);
  });

  it('affiche un repère de mois pour la première semaine', () => {
    renderWeeks(days(new Array(7).fill(1), '2026-02-02'));
    const label = document.querySelector('[class*="weekMonthLabel"]');
    expect(label?.textContent).not.toBe('');
  });
});
