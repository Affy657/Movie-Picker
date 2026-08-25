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

function renderAccount() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<AccountPage />} />
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

  it('affiche Google comme lié et propose de lier GitHub', async () => {
    renderAccount();

    expect(await screen.findByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Lié')).toBeInTheDocument();
    const linkGithub = await screen.findByRole('link', { name: /lier github/i });
    expect(linkGithub).toHaveAttribute('href', expect.stringContaining('/auth/oauth/github/start'));
  });

  it('délie un provider après confirmation', async () => {
    const user = userEvent.setup();
    let unlinkCalled = false;
    server.use(
      http.delete(`${TEST_API_V1}/auth/me/identities/google`, () => {
        unlinkCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderAccount();

    await screen.findByText('Google');
    await user.click(screen.getByRole('button', { name: 'Délier' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => expect(unlinkCalled).toBe(true));
    await waitFor(() => expect(screen.queryByText('Lié')).not.toBeInTheDocument());
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

    renderAccount();

    expect(
      await screen.findByRole('heading', { name: 'Définir un mot de passe' })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Mot de passe actuel')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'nouveau1234');
    await user.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), 'nouveau1234');
    await user.click(screen.getByRole('button', { name: 'Définir le mot de passe' }));

    await waitFor(() => expect(sentCurrentPassword ?? '').toBe(''));
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

    renderAccount();

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
