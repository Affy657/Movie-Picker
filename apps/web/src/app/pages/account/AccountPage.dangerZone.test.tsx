import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiJson } from '@/mocks/apiJson';
import { buildUserProfile } from '@/test-utils/userProfile';
import type { QueryClient } from '@tanstack/react-query';
import AccountPage from '@/app/pages/account/AccountPage';
import AccountDeletedNotice from '@/app/components/AccountDeletedNotice';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { TEST_API_V1, activeSessionsHandler } from '@/mocks/handlers';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { getStoredParticipant, setStoredParticipant } from '@/shared/utils/eventIdentityStorage';

const ME = buildUserProfile({
  userId: 'u-danger',
  displayName: 'Danger Tester',
  emailMasked: 'd***@test.local',
  uiTheme: 'light',
  accentColor: 'default',
  handle: 'danger',
  bio: null,
  isProfilePublic: true,
  avatarId: 'alpha',
});

function renderAccount(initialPath = '/settings/securite', client?: QueryClient) {
  return render(
    <AppTestProviders client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/settings/*" element={<AccountPage />} />
          <Route
            path="/"
            element={
              <div data-testid="home-marker">
                Accueil
                <AccountDeletedNotice />
              </div>
            }
          />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('AccountPage — zone de danger (MSW)', () => {
  const server = setupServer(activeSessionsHandler());

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    localStorage.setItem('moviepicker-ui-preference', 'light');
    localStorage.setItem('mp.session-hint', '1');
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME)));
  });
  afterEach(() => {
    server.resetHandlers();
    localStorage.clear();
    sessionStorage.clear();
  });
  afterAll(() => server.close());

  it('downloads the data through the export endpoint', async () => {
    const user = userEvent.setup();
    let exportCalled = false;
    server.use(
      http.get(`${TEST_API_V1}/auth/me/export`, () => {
        exportCalled = true;
        return apiJson<'UserDataExportResponse'>({
          exportedAt: '2026-06-11T09:00:00Z',
          profile: {
            userId: 'u1',
            email: 'd@test.local',
            displayName: 'Dana',
            handle: 'dana',
            isProfilePublic: true,
            isWatchlistPublic: true,
            isWatchedPublic: true,
            uiTheme: 'system',
            accentColor: 'default',
            avatarId: 'bolt',
            hasPassword: true,
            linkedProviders: [],
            notificationPreferences: {},
            ratingScale: 'five',
            dimWatched: false,
            letterboxdSyncWatchlist: true,
            letterboxdSyncWatched: true,
            eventTemplates: [],
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
          notifications: [],
          following: [],
          followers: [],
          createdEvents: [],
          participations: [],
          pushSubscriptions: [],
          signedInDevices: [],
          watchlist: [],
          movieLists: [],
          joinedMovieLists: [],
          pendingListInvitations: [],
          friendGroups: [],
          joinedFriendGroups: [],
          pendingFriendGroupInvitations: [],
          savedLists: [],
          watchedTitles: [],
          favorites: [],
          titlesAddedToOthersLists: [],
          knownDevices: [],
        });
      })
    );

    renderAccount();

    const exportButton = await screen.findByRole('button', { name: 'Télécharger mes données' });
    await user.click(exportButton);

    await waitFor(() => expect(exportCalled).toBe(true));
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('deletes the account after password confirmation then redirects', async () => {
    const user = userEvent.setup();
    let deletedWith: string | undefined;
    server.use(
      http.delete(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        const body = (await request.json()) as { password?: string };
        deletedWith = body.password;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderAccount();

    const openButton = await screen.findByRole('button', { name: 'Supprimer mon compte' });
    await user.click(openButton);

    const passwordInput = await screen.findByLabelText(
      'Saisissez votre mot de passe pour confirmer'
    );
    await user.type(passwordInput, 'abcd1234');
    await user.click(screen.getByRole('button', { name: 'Supprimer définitivement' }));

    await waitFor(() => expect(deletedWith).toBe('abcd1234'));
    expect(await screen.findByTestId('home-marker')).toBeInTheDocument();
    expect(screen.getByText('Votre compte est supprimé')).toBeInTheDocument();
  });

  it('warns about everything the deletion takes away', async () => {
    const user = userEvent.setup();
    renderAccount();

    await user.click(await screen.findByRole('button', { name: 'Supprimer mon compte' }));

    for (const lost of [/vos listes/i, /vos groupes/i, /liste à voir/i, /films vus/i]) {
      expect(screen.getAllByText(lost).length).toBeGreaterThan(0);
    }
  });

  it('forgets what this tab cached for the deleted account', async () => {
    const user = userEvent.setup();
    server.use(
      http.delete(`${TEST_API_V1}/auth/me`, () => new HttpResponse(null, { status: 204 }))
    );
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.watchlist.list, [{ tmdbId: 603 }]);
    setStoredParticipant('soiree-danger', 'p1', 'Danger Tester');

    renderAccount('/settings/securite', client);

    await user.click(await screen.findByRole('button', { name: 'Supprimer mon compte' }));
    await user.type(
      await screen.findByLabelText('Saisissez votre mot de passe pour confirmer'),
      'abcd1234'
    );
    await user.click(screen.getByRole('button', { name: 'Supprimer définitivement' }));

    expect(await screen.findByTestId('home-marker')).toBeInTheDocument();
    await waitFor(() => expect(client.getQueryData(queryKeys.watchlist.list)).toBeUndefined());
    expect(getStoredParticipant('soiree-danger')).toBeNull();
  });

  it('refuse la suppression sans mot de passe', async () => {
    const user = userEvent.setup();
    let deleteCalled = false;
    server.use(
      http.delete(`${TEST_API_V1}/auth/me`, () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderAccount();

    const openButton = await screen.findByRole('button', { name: 'Supprimer mon compte' });
    await user.click(openButton);

    await user.click(screen.getByRole('button', { name: 'Supprimer définitivement' }));

    expect(await screen.findByText('Le mot de passe est requis.')).toBeInTheDocument();
    expect(deleteCalled).toBe(false);
  });
});
