import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import SessionExpiredNotice from '@/app/components/SessionExpiredNotice';
import { LocaleProvider } from '@/shared/i18n';

const auth = vi.hoisted(() => ({
  sessionExpired: true,
  dismissSessionExpired: vi.fn(),
}));

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => auth,
}));

function renderNotice(path: string) {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <SessionExpiredNotice />
      </MemoryRouter>
    </LocaleProvider>
  );
}

describe('SessionExpiredNotice', () => {
  beforeEach(() => {
    auth.sessionExpired = true;
    auth.dismissSessionExpired.mockClear();
  });

  it('says the session expired and signs back in to the very same place', () => {
    renderNotice('/settings/profil?onglet=1#favoris');

    expect(screen.getByText('Votre session a expiré')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se reconnecter' })).toHaveAttribute(
      'href',
      `/login?returnTo=${encodeURIComponent('/settings/profil?onglet=1#favoris')}`
    );
  });

  it('lets the reader put the notice away', async () => {
    renderNotice('/watchlist');

    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(auth.dismissSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('stays quiet on the sign-in page itself', () => {
    renderNotice('/login?returnTo=%2Fwatchlist');

    expect(screen.queryByText('Votre session a expiré')).not.toBeInTheDocument();
  });

  it('stays quiet while the session is fine', () => {
    auth.sessionExpired = false;
    renderNotice('/watchlist');

    expect(screen.queryByText('Votre session a expiré')).not.toBeInTheDocument();
  });
});
