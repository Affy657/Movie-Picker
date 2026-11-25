import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import { buildUserProfile } from '@/test-utils/userProfile';
import LoginPage from '@/features/auth/pages/LoginPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';

function renderLogin(initialPath = '/login') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<h1>Accueil test</h1>} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('LoginPage (MSW)', () => {
  const server = setupServer();
  let sessionActive = false;

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  beforeEach(() => {
    sessionActive = false;
    localStorage.setItem('moviepicker-locale', 'fr');
  });
  afterEach(() => {
    server.resetHandlers();
    sessionActive = false;
  });
  afterAll(() => server.close());

  it('soumet le formulaire, appelle login et redirige vers returnTo', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        sessionActive
          ? apiJson<'UserProfileResponse'>(
              buildUserProfile({
                userId: 'u-login',
                displayName: 'Lee',
                emailMasked: 'l***@test.local',
                uiTheme: 'system',
                accentColor: 'default',
              })
            )
          : apiErrorJson(401, 'unauthorized')
      ),
      http.post(`${TEST_API_V1}/auth/login`, async () => {
        sessionActive = true;
        return apiJson<'LoginResponse'>({ userId: 'u1', displayName: 'Alice' });
      })
    );

    renderLogin('/login?returnTo=%2F');

    await user.type(screen.getByLabelText(/^e-mail$/i), 'lee@test.local');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'abcd1234');
    await user.click(screen.getByRole('button', { name: /^se connecter$/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Accueil test' })).toBeInTheDocument();
    });
  });

  it('tells the server where the account was heading', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        sessionActive
          ? apiJson<'UserProfileResponse'>(
              buildUserProfile({
                userId: 'u-login',
                displayName: 'Lee',
                emailMasked: 'l***@test.local',
              })
            )
          : apiErrorJson(401, 'unauthorized')
      ),
      http.post(`${TEST_API_V1}/auth/login`, async ({ request }) => {
        body = await request.json();
        sessionActive = true;
        return apiJson<'LoginResponse'>({ userId: 'u1', displayName: 'Alice' });
      })
    );

    renderLogin('/login?returnTo=%2Fe%2Fsoiree');

    await user.type(screen.getByLabelText(/^e-mail$/i), 'lee@test.local');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'abcd1234');
    await user.click(screen.getByRole('button', { name: /^se connecter$/i }));

    await waitFor(() =>
      expect(body).toEqual({ email: 'lee@test.local', password: 'abcd1234', returnTo: '/e/soiree' })
    );
  });

  it('en dev : bouton compte dev et connexion sans saisie', async () => {
    expect(import.meta.env.DEV).toBe(true);
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        sessionActive
          ? apiJson<'UserProfileResponse'>(
              buildUserProfile({
                userId: 'u-dev',
                displayName: 'Utilisateur dev',
                emailMasked: 'd***@test.local',
                uiTheme: 'system',
                accentColor: 'default',
              })
            )
          : apiErrorJson(401, 'unauthorized')
      ),
      http.post(`${TEST_API_V1}/auth/login`, async ({ request }) => {
        const body = (await request.json()) as { email?: string; password?: string };
        expect(body.email).toBe('dev@test.local');
        expect(body.password).toBe('DevTest123!');
        sessionActive = true;
        return apiJson<'LoginResponse'>({ userId: 'u1', displayName: 'Alice' });
      })
    );

    renderLogin('/login?returnTo=%2F');
    const devBtn = screen.getByRole('button', {
      name: /connexion rapide compte développeur/i,
    });
    expect(devBtn).toBeInTheDocument();

    await user.click(devBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Accueil test' })).toBeInTheDocument();
    });
  });

  it('describes the page for link previews', () => {
    renderLogin();
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Connectez-vous à Movie Picker pour retrouver vos soirées ciné, vos listes et votre profil.'
    );
  });

  it('leads back to the movie night the visitor came from and says why to sign in', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/oauth/providers`, () =>
        apiJson<'OAuthProvidersResponse'>({ providers: [] })
      )
    );
    renderLogin('/login?returnTo=%2Fe%2Fsoiree-horreur');

    expect(screen.getByRole('link', { name: /retour à la soirée/i })).toHaveAttribute(
      'href',
      '/e/soiree-horreur'
    );
    expect(screen.getByText(/rejoindre la soirée/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^accueil$/i })).not.toBeInTheDocument();
  });

  it('keeps the query of the join card in the way back to the movie night', () => {
    renderLogin('/login?returnTo=%2Fe%2Fsoiree-horreur%3Frejoindre%3D1');

    expect(screen.getByRole('link', { name: /retour à la soirée/i })).toHaveAttribute(
      'href',
      '/e/soiree-horreur?rejoindre=1'
    );
    expect(screen.getByRole('link', { name: /créer un compte/i })).toHaveAttribute(
      'href',
      `/register?returnTo=${encodeURIComponent('/e/soiree-horreur?rejoindre=1')}`
    );
  });

  it('leads back home when the visitor did not come from a movie night', () => {
    renderLogin('/login?returnTo=%2Fwatchlist');

    expect(screen.getByRole('link', { name: /^accueil$/i })).toHaveAttribute('href', '/');
    expect(screen.queryByText(/rejoindre la soirée/i)).not.toBeInTheDocument();
  });

  it('checks the fields with the messages of the app, not the browser bubbles', async () => {
    const user = userEvent.setup();
    let loginPosts = 0;
    server.use(
      http.post(`${TEST_API_V1}/auth/login`, () => {
        loginPosts += 1;
        return apiJson<'LoginResponse'>({ userId: 'u1', displayName: 'Alice' }, { status: 200 });
      })
    );
    renderLogin();

    const form = screen.getByRole('button', { name: /^se connecter$/i }).closest('form')!;
    expect(form).toHaveAttribute('novalidate');
    await user.click(screen.getByRole('button', { name: /^se connecter$/i }));

    expect(await screen.findByText(/saisissez une adresse e-mail valide/i)).toBeInTheDocument();
    expect(screen.getByText('Saisissez votre mot de passe.')).toBeInTheDocument();
    expect(loginPosts).toBe(0);
    expect(screen.getByRole('button', { name: 'Afficher le mot de passe' })).toBeInTheDocument();
  });

  it('exposes a "Forgot password?" link to /forgot-password', () => {
    renderLogin();
    const forgotLink = screen.getByRole('link', { name: /mot de passe oublié/i });
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink).toHaveAttribute('href', '/forgot-password');
  });

  it('shows a message when oauthError=email_not_verified is present', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/auth/oauth/providers`, () =>
        apiJson<'OAuthProvidersResponse'>({ providers: [] })
      )
    );

    renderLogin('/login?oauthError=email_not_verified');

    expect(
      await screen.findByText(/adresse e-mail de ce compte n’est pas vérifiée/i)
    ).toBeInTheDocument();
  });
});
