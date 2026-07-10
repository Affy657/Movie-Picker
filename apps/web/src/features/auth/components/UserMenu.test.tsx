import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import UserMenu from '@/features/auth/components/UserMenu';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import type { UserProfile } from '@/features/auth/types';

const baseUser: UserProfile = {
  userId: 'u1',
  displayName: 'Alice',
  emailMasked: 'a***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
  ratingScale: 'five',
  avatarId: '',
  handle: 'alice',
  bio: null,
  isProfilePublic: true,
};

function renderMenu(user: UserProfile = baseUser) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <UserMenu user={user} />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('UserMenu', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('le menu est fermé par défaut', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /menu du compte/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByRole('button', { name: /se déconnecter/i })).not.toBeInTheDocument();
  });

  it('ouvre le menu et affiche profil, compte et déconnexion', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voir mon profil public/i })).toHaveAttribute(
      'href',
      '/u/alice'
    );
    expect(screen.getByRole('link', { name: /mon compte/i })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument();
  });

  it("place le focus sur le premier élément à l'ouverture", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /voir mon profil public/i })).toHaveFocus()
    );
  });

  it("masque le lien profil quand l'utilisateur n'a pas de handle", async () => {
    const user = userEvent.setup();
    renderMenu({ ...baseUser, handle: '' });

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));

    expect(screen.queryByRole('link', { name: /voir mon profil public/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /mon compte/i })).toBeInTheDocument();
  });

  it('ferme le menu avec Échap et rend le focus au déclencheur', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: /menu du compte/i });

    await user.click(trigger);
    expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /se déconnecter/i })).not.toBeInTheDocument()
    );
    expect(trigger).toHaveFocus();
  });

  it('déclenche la déconnexion au clic sur Se déconnecter', async () => {
    const user = userEvent.setup();
    let loggedOut = false;
    server.use(
      http.post(`${TEST_API_V1}/auth/logout`, () => {
        loggedOut = true;
        return new HttpResponse(null, { status: 204 });
      })
    );
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));
    await user.click(screen.getByRole('button', { name: /se déconnecter/i }));

    await waitFor(() => expect(loggedOut).toBe(true));
  });
});
