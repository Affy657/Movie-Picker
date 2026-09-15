import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import SignedOutState from '@/shared/components/SignedOutState';
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

  it('propose connexion et inscription en gardant la page de retour', () => {
    renderState('/watchlist');

    expect(screen.getByRole('heading', { level: 2, name: 'Connectez-vous' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      '/login?returnTo=%2Fwatchlist'
    );
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/register?returnTo=%2Fwatchlist'
    );
  });

  it('trace le clic sur chaque appel à l’action', async () => {
    renderState('/watchlist');

    await userEvent.click(screen.getByRole('link', { name: 'Se connecter' }));
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
