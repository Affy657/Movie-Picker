import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AccountPage from '@/features/auth/pages/AccountPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

const ME = {
  userId: 'u-danger',
  displayName: 'Danger Tester',
  emailMasked: 'd***@test.local',
  uiTheme: 'light',
  accentColor: 'default',
  handle: 'danger',
  bio: null,
  isProfilePublic: true,
  avatarId: 'alpha',
};

function renderAccount(initialPath = '/settings/securite') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/settings/*" element={<AccountPage />} />
          <Route path="/decouvrir" element={<div data-testid="home-marker">Accueil</div>} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('AccountPage — zone de danger (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    localStorage.setItem('moviepicker-ui-preference', 'light');
    localStorage.setItem('mp.session-hint', '1');
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME)));
  });
  afterEach(() => {
    server.resetHandlers();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('télécharge les données via l’endpoint d’export', async () => {
    const user = userEvent.setup();
    let exportCalled = false;
    server.use(
      http.get(`${TEST_API_V1}/auth/me/export`, () => {
        exportCalled = true;
        return HttpResponse.json({
          exportedAt: '2026-06-11T09:00:00Z',
          profile: { email: 'd@test.local' },
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

  it('supprime le compte après confirmation par mot de passe puis redirige', async () => {
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
