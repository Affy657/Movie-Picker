import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ProfileRhythm from './ProfileRhythm';

const AUTUMN = [
  { date: '2026-08-25', count: 1 },
  { date: '2026-08-31', count: 0 },
  { date: '2026-09-01', count: 1 },
  { date: '2026-09-03', count: 1 },
  { date: '2026-09-08', count: 1 },
  { date: '2026-09-30', count: 0 },
  { date: '2026-10-06', count: 1 },
  { date: '2026-10-21', count: 0 },
];

function renderRhythm(points = AUTUMN, streakWeeks = 0, bestStreakWeeks = 0) {
  return render(
    <AppTestProviders>
      <ProfileRhythm points={points} streakWeeks={streakWeeks} bestStreakWeeks={bestStreakWeeks} />
    </AppTestProviders>
  );
}

describe('ProfileRhythm', () => {
  it('renders nothing without a single movie night', () => {
    const { container } = renderRhythm([{ date: '2026-06-01', count: 0 }]);
    expect(container).toBeEmptyDOMElement();
  });

  it('sums the movie nights of the six months under its title', () => {
    renderRhythm();
    expect(screen.getByRole('heading', { name: 'Rythme', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('5 soirées ces six derniers mois')).toBeInTheDocument();
  });

  it('writes the count of every month, and names the partial first month and the current one', () => {
    renderRhythm();
    const months = within(screen.getByRole('list', { name: 'Soirées par mois' })).getAllByRole(
      'listitem'
    );
    expect(months).toHaveLength(3);
    expect(within(months[0]!).getByText('fin août : 1 soirée')).toHaveClass('visually-hidden');
    expect(within(months[0]!).getByText('fin août')).toBeInTheDocument();
    expect(within(months[1]!).getByText('septembre : 3 soirées')).toBeInTheDocument();
    expect(within(months[1]!).getByText('3')).toBeInTheDocument();
    expect(within(months[2]!).getByText('octobre : 1 soirée, en cours')).toBeInTheDocument();
  });

  it('counts the movie nights of each weekday', () => {
    renderRhythm();
    const weekdays = within(
      screen.getByRole('list', { name: 'Soirées par jour de la semaine' })
    ).getAllByRole('listitem');
    expect(weekdays).toHaveLength(7);
    expect(within(weekdays[1]!).getByText('mardi : 4 soirées')).toBeInTheDocument();
    expect(within(weekdays[3]!).getByText('jeudi : 1 soirée')).toBeInTheDocument();
    expect(within(weekdays[4]!).getByText('vendredi : aucune soirée')).toBeInTheDocument();
  });

  it('tells the streak and its record, with what makes a week count', () => {
    renderRhythm(AUTUMN, 3, 5);
    expect(screen.getByText('3 semaines de suite')).toBeInTheDocument();
    expect(screen.getByText(/record : 5 semaines/)).toBeInTheDocument();
    expect(
      screen.getByText('Une semaine compte quand une soirée s’y termine avec un film gagnant.')
    ).toBeInTheDocument();
  });

  it('says when the current streak is the record', () => {
    renderRhythm(AUTUMN, 4, 4);
    expect(screen.getByText(/c’est le record/)).toBeInTheDocument();
  });

  it('keeps a single week out of the streak line', () => {
    renderRhythm(AUTUMN, 1, 1);
    expect(screen.queryByText(/de suite/)).not.toBeInTheDocument();
  });
});
