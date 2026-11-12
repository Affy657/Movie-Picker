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

  it('draws the weeks as a single image named after the total, without a control per cell', () => {
    renderWeeks([
      { date: '2026-01-01', count: 2 },
      { date: '2026-01-02', count: 3 },
    ]);
    expect(
      screen.getByRole('img', { name: /soirées par semaine.*5 au total/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('aggregates the days into one cell per week', () => {
    renderWeeks(days(new Array(21).fill(0), '2026-01-05'));
    expect(document.querySelectorAll('[class*="weekCell"]')).toHaveLength(3);
  });

  it('handles an invalid date without crashing (isNaN branch)', () => {
    renderWeeks([{ date: 'pas-une-date', count: 3 }]);
    expect(document.querySelectorAll('[class*="weekCell"]')).toHaveLength(1);
  });

  it('shows a month marker for the first week', () => {
    renderWeeks(days(new Array(7).fill(1), '2026-02-02'));
    const label = document.querySelector('[class*="weekMonthLabel"]');
    expect(label?.textContent).not.toBe('');
  });
});
