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

  it('affiche le record uniquement quand il dépasse le streak courant', () => {
    renderFlame(1, 2);
    expect(screen.getByText('Record 2 semaines')).toBeInTheDocument();
  });

  it("n'affiche pas de record quand il est égal au streak courant", () => {
    renderFlame(3, 3);
    expect(screen.queryByText(/^Record/)).not.toBeInTheDocument();
  });

  it('affiche un état éteint avec le record quand le streak est cassé', () => {
    renderFlame(0, 5);
    expect(screen.getByText('Aucune série en cours')).toBeInTheDocument();
    expect(screen.getByText('Record 5 semaines')).toBeInTheDocument();
  });

  it('expose un nom accessible regroupant le streak courant et le record', () => {
    renderFlame(3, 5);
    expect(
      screen.getByRole('group', { name: '3 semaines de suite, Record 5 semaines' })
    ).toBeInTheDocument();
  });

  it('expose un nom accessible sans record en double quand ils sont égaux', () => {
    renderFlame(3, 3);
    expect(screen.getByRole('group', { name: '3 semaines de suite' })).toBeInTheDocument();
  });
});
