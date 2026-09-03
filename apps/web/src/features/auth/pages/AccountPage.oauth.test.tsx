import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AccountPage from '@/features/auth/pages/AccountPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

const ME_NO_PASSWORD = {
  userId: 'u-oauth-acc',
  displayName: 'OAuth User',
  emailMasked: 'o***@test.local',
  uiTheme: 'light',
  accentColor: 'default',
  handle: 'oauthuser',
  bio: null,
  isProfilePublic: true,
  avatarId: 'alpha',
  hasPassword: false,
  linkedProviders: ['google'],
};

function renderAccount(initialPath = '/settings') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/settings/*" element={<AccountPage />} />
          <Route path="/" element={<div data-testid="home-marker" />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('AccountPage — connexions et compte sans mot de passe (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    localStorage.setItem('moviepicker-ui-preference', 'light');
    localStorage.setItem('mp.session-hint', '1');
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_NO_PASSWORD)),
      http.get(`${TEST_API_V1}/auth/oauth/providers`, () =>
        HttpResponse.json({ providers: ['google', 'github'] })
      )
    );
  });
  afterEach(() => {
    server.resetHandlers();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('affiche Google comme lié, seul moyen de connexion, et propose de lier GitHub', async () => {
    renderAccount('/settings/integrations');

    expect(await screen.findByText('Google')).toBeInTheDocument();
    expect(
      screen.getByText(
        'C’est votre seule méthode de connexion. Définissez un mot de passe avant de pouvoir la délier.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Délier' })).toBeDisabled();
    const linkGithub = await screen.findByRole('link', { name: /lier github/i });
    expect(linkGithub).toHaveAttribute('href', expect.stringContaining('/auth/oauth/github/start'));
  });

  it('délie un provider après confirmation, quand il n’est pas le dernier', async () => {
    const user = userEvent.setup();
    let unlinkCalled = false;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({ ...ME_NO_PASSWORD, linkedProviders: ['google', 'github'] })
      ),
      http.delete(`${TEST_API_V1}/auth/me/identities/google`, () => {
        unlinkCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderAccount('/settings/integrations');

    await screen.findByText('Google');
    const unlinkButtons = await screen.findAllByRole('button', { name: 'Délier' });
    await user.click(unlinkButtons[0]!);
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => expect(unlinkCalled).toBe(true));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /lier google/i })).toBeInTheDocument()
    );
  });

  it('propose de définir un mot de passe quand le compte n’en a pas', async () => {
    const user = userEvent.setup();
    let sentCurrentPassword: string | undefined;
    server.use(
      http.patch(`${TEST_API_V1}/auth/me/password`, async ({ request }) => {
        const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
        sentCurrentPassword = body.currentPassword;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderAccount('/settings/securite');

    await user.click(await screen.findByRole('button', { name: 'Définir' }));
    expect(screen.queryByLabelText('Mot de passe actuel')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'nouveau1234');
    await user.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), 'nouveau1234');
    await user.click(screen.getByRole('button', { name: 'Définir le mot de passe' }));

    await waitFor(() => expect(sentCurrentPassword ?? '').toBe(''));
  });

  it('affiche le message de succès puis redirige seulement après le délai', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    server.use(
      http.patch(`${TEST_API_V1}/auth/me/password`, () => new HttpResponse(null, { status: 204 }))
    );

    render(
      <AppTestProviders>
        <MemoryRouter initialEntries={['/settings/securite']}>
          <Routes>
            <Route path="/settings/*" element={<AccountPage />} />
            <Route path="/login" element={<div data-testid="login-marker" />} />
          </Routes>
        </MemoryRouter>
      </AppTestProviders>
    );

    await user.click(await screen.findByRole('button', { name: 'Définir' }));
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'nouveau1234');
    await user.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), 'nouveau1234');
    await user.click(screen.getByRole('button', { name: 'Définir le mot de passe' }));

    expect(await screen.findByText(/mot de passe défini/i)).toBeInTheDocument();
    expect(screen.queryByTestId('login-marker')).not.toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(4000);

    expect(await screen.findByTestId('login-marker')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('supprime le compte par confirmation du handle quand il n’y a pas de mot de passe', async () => {
    const user = userEvent.setup();
    let sentConfirmation: string | undefined;
    server.use(
      http.delete(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        const body = (await request.json()) as { confirmation?: string };
        sentConfirmation = body.confirmation;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderAccount('/settings/securite');

    const openButton = await screen.findByRole('button', { name: 'Supprimer mon compte' });
    await user.click(openButton);

    const confirmInput = await screen.findByLabelText(
      'Saisissez votre handle ou votre e-mail pour confirmer'
    );
    await user.type(confirmInput, 'oauthuser');
    await user.click(screen.getByRole('button', { name: 'Supprimer définitivement' }));

    await waitFor(() => expect(sentConfirmation).toBe('oauthuser'));
    expect(await screen.findByTestId('home-marker')).toBeInTheDocument();
  });
});
