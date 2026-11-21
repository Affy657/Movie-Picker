import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ProfileStatsSummary from './ProfileStatsSummary';

function renderSummary(
  props: Partial<{
    nights: number;
    winning: number | null;
    streakWeeks: number;
    bestStreakWeeks: number;
  }> = {}
) {
  return render(
    <AppTestProviders>
      <ProfileStatsSummary
        nights={props.nights ?? 46}
        winning={props.winning === undefined ? 8 : props.winning}
        streakWeeks={props.streakWeeks ?? 25}
        bestStreakWeeks={props.bestStreakWeeks ?? 25}
        targetId="profile-stats"
      />
    </AppTestProviders>
  );
}

describe('ProfileStatsSummary', () => {
  it('sums up the movie nights, the winners and the streak, each leading to the statistics', () => {
    renderSummary();
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      '46 soirées',
      '8 films gagnants',
      '25 semaines de suite',
    ]);
    for (const link of links) expect(link).toHaveAttribute('href', '#profile-stats');
  });

  it('agrees each item in the singular', () => {
    renderSummary({ nights: 1, winning: 1, streakWeeks: 0 });
    expect(screen.getByRole('link', { name: '1 soirée' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '1 film gagnant' })).toBeInTheDocument();
  });

  it('leaves out the winners when they are hidden or at zero', () => {
    renderSummary({ winning: null });
    expect(screen.queryByText(/gagnant/)).not.toBeInTheDocument();
    renderSummary({ winning: 0 });
    expect(screen.queryByText(/gagnant/)).not.toBeInTheDocument();
  });

  it('shows the streak from two weeks in a row only', () => {
    renderSummary({ streakWeeks: 1, bestStreakWeeks: 4 });
    expect(screen.queryByText(/de suite/)).not.toBeInTheDocument();
  });

  it('renders nothing without anything to sum up', () => {
    const { container } = renderSummary({ nights: 0, winning: 0, streakWeeks: 0 });
    expect(container).toBeEmptyDOMElement();
  });
});
