import { describe, it, expect, beforeAll, afterEach, afterAll, onTestFinished, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import UserMenu from '@/app/components/UserMenu';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { createGroupsHandlers, TEST_API_V1 } from '@/mocks/handlers';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { resetPwaInstallRuntime } from '@/shared/hooks/usePwaInstall';
import type { UserProfile } from '@/features/auth/types';
import { buildUserProfile } from '@/test-utils/userProfile';

const baseUser = buildUserProfile({
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
  isWatchlistPublic: true,
  letterboxdUsername: null,
  letterboxdLastSyncAt: null,
  letterboxdLastSyncError: null,
  letterboxdPendingReconciliationCount: 0,
  hasPassword: true,
  linkedProviders: [],
});

function emulateDialogFocusRestoration() {
  const focusedBeforeOpening = new WeakMap<HTMLDialogElement, Element | null>();
  const showModal = vi
    .spyOn(HTMLDialogElement.prototype, 'showModal')
    .mockImplementation(function showModal(this: HTMLDialogElement) {
      focusedBeforeOpening.set(this, document.activeElement);
      this.setAttribute('open', '');
      this.querySelector<HTMLElement>('button, input, textarea, select, a[href]')?.focus();
    });
  const close = vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function close(
    this: HTMLDialogElement
  ) {
    this.removeAttribute('open');
    const previous = focusedBeforeOpening.get(this);
    if (previous instanceof HTMLElement) previous.focus();
    this.dispatchEvent(new Event('close'));
  });
  onTestFinished(() => {
    showModal.mockRestore();
    close.mockRestore();
  });
}

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
  const server = setupServer(...createGroupsHandlers());

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    localStorage.clear();
    resetPwaInstallRuntime();
  });
  afterAll(() => server.close());

  it('the menu is closed by default', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /menu du compte/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByRole('button', { name: /se déconnecter/i })).not.toBeInTheDocument();
  });

  it('opens the menu with the public profile on top, then settings, preferences and links', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));

    const profile = screen.getByRole('menuitem', { name: /voir mon profil public/i });
    expect(profile).toHaveAttribute('href', '/u/alice');
    expect(profile).toHaveTextContent('Alice');
    expect(profile).toHaveTextContent('@alice');
    expect(screen.getAllByRole('menuitem')[0]).toBe(profile);
    expect(screen.getByRole('menuitem', { name: /paramètres/i })).toHaveAttribute(
      'href',
      '/settings'
    );
    expect(screen.getByRole('group', { name: /apparence/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /langue/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /nouveautés/i })).toHaveAttribute(
      'href',
      '/nouveautes'
    );
    expect(screen.getByRole('menuitem', { name: /soutenir le projet/i })).toHaveAttribute(
      'href',
      '/soutenir'
    );
    const labels = screen
      .getAllByRole('menuitem')
      .slice(1)
      .map((item) => item.getAttribute('aria-label') ?? item.textContent);
    expect(labels).toEqual([
      'Mes groupes',
      'Paramètres',
      'Nouveautés',
      'Envoyer un retour',
      'Installer l’app',
      'Soutenir le projet',
      'Se déconnecter',
    ]);
  });

  it('leads to My groups right after the profile, with the group invitations waiting for an answer', async () => {
    server.use(
      ...createGroupsHandlers(
        [],
        [
          { groupId: 'g1', name: 'Ciné-club', invitedByDisplayName: 'Inès' },
          { groupId: 'g2', name: 'Famille', invitedByDisplayName: 'Sam' },
        ]
      )
    );
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));

    const groups = screen.getAllByRole('menuitem')[1];
    expect(groups).toHaveAttribute('href', '/groupes');
    await waitFor(() =>
      expect(groups).toHaveAccessibleName('Mes groupes, 2 invitations en attente')
    );
    expect(groups).toHaveTextContent('2');
  });

  it('shows no count on My groups when no invitation is waiting', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));

    const groups = screen.getByRole('menuitem', { name: /mes groupes/i });
    await waitFor(() => expect(groups).toHaveAccessibleName('Mes groupes'));
    expect(groups).toHaveTextContent(/^Mes groupes$/);
  });

  it('names the profile entry by its visible name and handle first', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));

    const profile = screen.getByRole('menuitem', { name: /voir mon profil public/i });
    expect(profile).not.toHaveAttribute('aria-label');
    expect(profile).toHaveAccessibleName(
      /^Alice\s*@alice, profil public\s*Voir mon profil public$/
    );
  });

  it('puts the focus on the profile when opening', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));

    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: /voir mon profil public/i })).toHaveFocus()
    );
  });

  it('shows the name without a profile link when the user has no handle', async () => {
    const user = userEvent.setup();
    renderMenu({ ...baseUser, handle: '' });

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));

    expect(
      screen.queryByRole('menuitem', { name: /voir mon profil public/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /paramètres/i })).toBeInTheDocument();
  });

  it('hides the profile link when my profile is private, since it would lead to a 404', async () => {
    const user = userEvent.setup();
    renderMenu({ ...baseUser, isProfilePublic: false });

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));

    expect(
      screen.queryByRole('menuitem', { name: /voir mon profil public/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('changes the theme from the menu and keeps the menu open', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(baseUser))
    );
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));
    const appearance = screen.getByRole('group', { name: /apparence/i });
    const dark = within(appearance).getByRole('menuitemradio', { name: /sombre/i });
    expect(within(appearance).getByRole('menuitemradio', { name: /système/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await user.click(dark);

    expect(dark).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menu', { name: /menu du compte/i })).toBeInTheDocument();
  });

  it('switches the language from the menu', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));
    const language = screen.getByRole('group', { name: /langue/i });
    expect(within(language).getByRole('menuitemradio', { name: 'Français' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await user.click(within(language).getByRole('menuitemradio', { name: 'English' }));

    expect(await screen.findByRole('menu', { name: /account menu/i })).toBeInTheDocument();
  });

  it('marks Whats new as unread when a feature version shipped since the last visit', async () => {
    const user = userEvent.setup();
    localStorage.setItem('mp.release-notes-seen', '1.0.0');
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));

    expect(screen.getByRole('menuitem', { name: /nouveautés/i })).toHaveTextContent(/nouveau$/i);
  });

  it('opens the feedback dialog, which takes ideas as well as problems', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));
    await user.click(screen.getByRole('menuitem', { name: /envoyer un retour/i }));

    expect(screen.queryByRole('button', { name: /se déconnecter/i })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /envoyer un retour/i })).toBeInTheDocument();
    });
  });

  it('closes the menu with Escape and gives the focus back to the trigger', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: /menu du compte/i });

    await user.click(trigger);
    expect(screen.getByRole('menuitem', { name: /se déconnecter/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /se déconnecter/i })).not.toBeInTheDocument()
    );
    expect(trigger).toHaveFocus();
  });

  it.each([
    ['feedback', /envoyer un retour/i, /envoyer un retour/i],
    ['install guide', /installer l['’]app/i, /installer movie picker/i],
  ])(
    'gives the focus back to the account button once the %s window closes, with the keyboard',
    async (_window, entryName, headingName) => {
      emulateDialogFocusRestoration();
      const user = userEvent.setup();
      renderMenu();
      const trigger = screen.getByRole('button', { name: /menu du compte/i });

      trigger.focus();
      await user.keyboard('{Enter}');
      screen.getByRole('menuitem', { name: entryName }).focus();
      await user.keyboard('{Enter}');
      const dialog = (await screen.findByRole('heading', { name: headingName })).closest('dialog')!;
      within(dialog)
        .getAllByRole('button', { name: /fermer/i })[0]!
        .focus();
      await user.keyboard('{Enter}');

      await waitFor(() => expect(dialog).not.toBeInTheDocument());
      expect(trigger).toHaveFocus();
    }
  );

  it('ouvre le guide d’installation et ferme le menu', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));
    await user.click(screen.getByRole('menuitem', { name: /installer l['’]app/i }));

    expect(screen.queryByRole('button', { name: /se déconnecter/i })).not.toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /installer movie picker/i })
    ).toBeInTheDocument();
  });

  it('triggers the sign-out when clicking Sign out', async () => {
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
    await user.click(screen.getByRole('menuitem', { name: /se déconnecter/i }));

    await waitFor(() => expect(loggedOut).toBe(true));
  });

  it('signs out without an error when the server already revoked the session', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(baseUser)),
      http.post(`${TEST_API_V1}/auth/logout`, () => apiErrorJson(401, 'unauthorized'))
    );
    const client = createTestQueryClient();
    render(
      <AppTestProviders client={client}>
        <MemoryRouter>
          <UserMenu user={baseUser} />
        </MemoryRouter>
      </AppTestProviders>
    );
    await waitFor(() =>
      expect(client.getQueryData<UserProfile | null>(queryKeys.auth.me)?.userId).toBe('u1')
    );

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));
    await user.click(screen.getByRole('menuitem', { name: /se déconnecter/i }));

    await waitFor(() => expect(client.getQueryData(queryKeys.auth.me)).toBeNull());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('signing out forgets the movie night identities and clears the query cache', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${TEST_API_V1}/auth/logout`, () => new HttpResponse(null, { status: 204 }))
    );
    sessionStorage.setItem(
      'moviepicker_participant_abc',
      JSON.stringify({ participantId: 'p1', pseudo: 'Alice' })
    );
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.event.detail('abc'), { slug: 'abc' });
    client.setQueryData(queryKeys.movies.list('abc'), [{ id: 'm1', myVote: 1 }]);
    render(
      <AppTestProviders client={client}>
        <MemoryRouter>
          <UserMenu user={baseUser} />
        </MemoryRouter>
      </AppTestProviders>
    );

    await user.click(screen.getByRole('button', { name: /menu du compte/i }));
    await user.click(screen.getByRole('menuitem', { name: /se déconnecter/i }));

    await waitFor(() => expect(client.getQueryData(queryKeys.auth.me)).toBeNull());
    expect(sessionStorage.getItem('moviepicker_participant_abc')).toBeNull();
    expect(client.getQueryData(queryKeys.event.detail('abc'))).toBeUndefined();
    expect(client.getQueryData(queryKeys.movies.list('abc'))).toBeUndefined();
  });
});
