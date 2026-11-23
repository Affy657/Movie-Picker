import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import SignedOutState from '@/shared/components/SignedOutState';
import buttonStyles from '@/shared/components/Button.module.css';
import { LocaleProvider } from '@/shared/i18n';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track }),
}));

function renderState(returnTo = '/watchlist') {
  return render(
    <LocaleProvider>
      <MemoryRouter>
        <SignedOutState
          icon={<svg />}
          title="Connectez-vous"
          message="Votre watchlist vous attend."
          returnTo={returnTo}
        />
      </MemoryRouter>
    </LocaleProvider>
  );
}

describe('SignedOutState', () => {
  beforeEach(() => {
    track.mockClear();
  });

  it('puts account creation first and keeps the page to come back to', () => {
    renderState('/watchlist');

    expect(screen.getByRole('heading', { level: 2, name: 'Connectez-vous' })).toBeInTheDocument();
    const [register, login] = screen.getAllByRole('link');
    expect(register).toHaveAccessibleName('Créer un compte');
    expect(register).toHaveAttribute('href', '/register?returnTo=%2Fwatchlist');
    expect(register).toHaveClass(buttonStyles.primary!);
    expect(login).toHaveAccessibleName('J’ai déjà un compte');
    expect(login).toHaveAttribute('href', '/login?returnTo=%2Fwatchlist');
    expect(login).not.toHaveClass(buttonStyles.primary!);
  });

  it('tracks the click on every call to action', async () => {
    renderState('/watchlist');

    await userEvent.click(screen.getByRole('link', { name: 'J’ai déjà un compte' }));
    expect(track).toHaveBeenCalledWith('signed_out_cta_clicked', {
      page: '/watchlist',
      cta: 'login',
    });

    await userEvent.click(screen.getByRole('link', { name: 'Créer un compte' }));
    expect(track).toHaveBeenCalledWith('signed_out_cta_clicked', {
      page: '/watchlist',
      cta: 'register',
    });
  });
});
