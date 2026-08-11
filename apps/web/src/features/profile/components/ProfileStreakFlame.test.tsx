import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ProfileStreakFlame from './ProfileStreakFlame';

function renderFlame(weeks: number) {
  return render(
    <AppTestProviders>
      <ProfileStreakFlame weeks={weeks} />
    </AppTestProviders>
  );
}

describe('ProfileStreakFlame', () => {
  it('affiche le nombre de semaines', () => {
    renderFlame(7);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('accorde le label au singulier pour une seule semaine', () => {
    renderFlame(1);
    expect(screen.getByText('semaine de suite')).toBeInTheDocument();
  });

  it('accorde le label au pluriel au-delà d’une semaine', () => {
    renderFlame(4);
    expect(screen.getByText('semaines de suite')).toBeInTheDocument();
  });

  it('affiche une flamme éteinte quand le streak est à zéro', () => {
    const { container } = renderFlame(0);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('expose un nom accessible regroupant le chiffre et le label', () => {
    renderFlame(3);
    expect(screen.getByRole('group', { name: '3 semaines de suite' })).toBeInTheDocument();
  });
});
