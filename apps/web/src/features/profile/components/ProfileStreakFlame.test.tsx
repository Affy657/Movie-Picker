import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ProfileStreakFlame from './ProfileStreakFlame';

function renderFlame(weeks: number, bestWeeks: number) {
  return render(
    <AppTestProviders>
      <ProfileStreakFlame weeks={weeks} bestWeeks={bestWeeks} />
    </AppTestProviders>
  );
}

describe('ProfileStreakFlame', () => {
  it('affiche le streak courant', () => {
    renderFlame(7, 7);
    expect(screen.getByText('7 semaines de suite')).toBeInTheDocument();
  });

  it('accorde le label au singulier pour une seule semaine', () => {
    renderFlame(1, 1);
    expect(screen.getByText('1 semaine de suite')).toBeInTheDocument();
  });

  it('shows the record only when it exceeds the current streak', () => {
    renderFlame(1, 2);
    expect(screen.getByText('Record 2 semaines')).toBeInTheDocument();
  });

  it('shows no record when it equals the current streak', () => {
    renderFlame(3, 3);
    expect(screen.queryByText(/^Record/)).not.toBeInTheDocument();
  });

  it('shows an extinguished state with the record when the streak is broken', () => {
    renderFlame(0, 5);
    expect(screen.getByText('Aucune série en cours')).toBeInTheDocument();
    expect(screen.getByText('Record 5 semaines')).toBeInTheDocument();
  });

  it('expose un nom accessible regroupant le streak courant et le record', () => {
    renderFlame(3, 5);
    expect(
      screen.getByRole('region', { name: '3 semaines de suite, Record 5 semaines' })
    ).toBeInTheDocument();
  });

  it('exposes an accessible name without a duplicated record when they are equal', () => {
    renderFlame(3, 3);
    expect(screen.getByRole('region', { name: '3 semaines de suite' })).toBeInTheDocument();
  });
});
