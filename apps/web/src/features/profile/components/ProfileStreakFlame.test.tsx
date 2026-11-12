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
    expect(screen.getByText(/^7 semaines de suite/)).toBeInTheDocument();
  });

  it('accorde le label au singulier pour une seule semaine', () => {
    renderFlame(1, 1);
    expect(screen.getByText(/^1 semaine de suite/)).toBeInTheDocument();
  });

  it('tells assistive technologies the record only when it exceeds the current streak', () => {
    renderFlame(1, 2);
    expect(screen.getByText(/Record 2 semaines/)).toHaveClass('visually-hidden');
  });

  it('shows no record when it equals the current streak', () => {
    renderFlame(3, 3);
    expect(screen.queryByText(/Record/)).not.toBeInTheDocument();
  });

  it('renders nothing once the streak is broken, whatever the record', () => {
    const { container } = renderFlame(0, 5);
    expect(container).toBeEmptyDOMElement();
  });
});
