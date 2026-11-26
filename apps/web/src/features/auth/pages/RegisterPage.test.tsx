import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import { buildUserProfile } from '@/test-utils/userProfile';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';

function renderRegister(initialPath = '/register') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<h1>Accueil après inscription</h1>} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('RegisterPage (MSW)', () => {
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

  it('successful sign-up then navigation to returnTo', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        sessionActive
          ? apiJson<'UserProfileResponse'>(
              buildUserProfile({
                userId: 'u-reg',
                displayName: 'Sam',
                emailMasked: 's***@test.local',
                uiTheme: 'system',
                accentColor: 'default',
              })
            )
          : apiErrorJson(401, 'unauthorized')
      ),
      http.post(`${TEST_API_V1}/auth/register`, async () => {
        sessionActive = true;
        return apiJson<'RegisterResponse'>({ userId: 'u1', displayName: 'Alice' }, { status: 201 });
      })
    );

    renderRegister('/register?returnTo=%2F');

    await user.type(screen.getByLabelText(/^nom affiché$/i), 'Sam');
    await user.type(screen.getByLabelText(/^e-mail$/i), 'sam@test.local');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'abcd1234');
    await user.click(screen.getByRole('button', { name: /créer mon compte/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Accueil après inscription' })
      ).toBeInTheDocument();
    });
  });

  it('tells the server where the new account was heading', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        sessionActive
          ? apiJson<'UserProfileResponse'>(
              buildUserProfile({
                userId: 'u-reg',
                displayName: 'Sam',
                emailMasked: 's***@test.local',
              })
            )
          : apiErrorJson(401, 'unauthorized')
      ),
      http.post(`${TEST_API_V1}/auth/register`, async ({ request }) => {
        body = await request.json();
        sessionActive = true;
        return apiJson<'RegisterResponse'>({ userId: 'u1', displayName: 'Alice' }, { status: 201 });
      })
    );

    renderRegister('/register?returnTo=%2Fe%2Fsoiree');

    await user.type(screen.getByLabelText(/^nom affiché$/i), 'Sam');
    await user.type(screen.getByLabelText(/^e-mail$/i), 'sam@test.local');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'abcd1234');
    await user.click(screen.getByRole('button', { name: /créer mon compte/i }));

    await waitFor(() =>
      expect(body).toEqual({
        email: 'sam@test.local',
        password: 'abcd1234',
        displayName: 'Sam',
        returnTo: '/e/soiree',
      })
    );
  });

  it('describes the page for link previews', () => {
    renderRegister();
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Créez votre compte Movie Picker, gratuit, pour organiser vos soirées ciné : chacun propose, tout le monde vote, la roue tranche.'
    );
  });

  it('leads back to the movie night the visitor came from and says what joining brings', () => {
    renderRegister('/register?returnTo=%2Fe%2Fsoiree-horreur');

    expect(screen.getByRole('link', { name: /retour à la soirée/i })).toHaveAttribute(
      'href',
      '/e/soiree-horreur'
    );
    expect(screen.getByText(/rejoindre la soirée/i)).toBeInTheDocument();
  });

  it('shows the Google and GitHub sign-up before the form', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/oauth/providers`, () =>
        apiJson<'OAuthProvidersResponse'>({ providers: ['google', 'github'] })
      )
    );
    renderRegister();

    const google = await screen.findByRole('link', { name: /continuer avec google/i });
    const submit = screen.getByRole('button', { name: /créer mon compte/i });
    expect(google.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('explains a name made of spaces instead of sending it', async () => {
    const user = userEvent.setup();
    let registerPosts = 0;
    server.use(
      http.post(`${TEST_API_V1}/auth/register`, () => {
        registerPosts += 1;
        return apiJson<'RegisterResponse'>({ userId: 'u1', displayName: 'Alice' }, { status: 201 });
      })
    );
    renderRegister();

    await user.type(screen.getByLabelText(/^nom affiché$/i), '   ');
    await user.type(screen.getByLabelText(/^e-mail$/i), 'sam@test.local');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'abcd1234');
    await user.click(screen.getByRole('button', { name: /créer mon compte/i }));

    expect(await screen.findByText(/ne peut pas contenir que des espaces/i)).toBeInTheDocument();
    expect(registerPosts).toBe(0);
  });

  it('checks the fields with the messages of the app, not the browser bubbles', async () => {
    const user = userEvent.setup();
    renderRegister();

    const form = screen.getByRole('button', { name: /créer mon compte/i }).closest('form')!;
    expect(form).toHaveAttribute('novalidate');
    await user.type(screen.getByLabelText(/^e-mail$/i), 'sam');
    await user.click(screen.getByRole('button', { name: /créer mon compte/i }));

    expect(await screen.findByText('Indiquez le nom que vos amis verront.')).toBeInTheDocument();
    expect(screen.getByText(/saisissez une adresse e-mail valide/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^e-mail$/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('names the display name and says the handle comes from it', () => {
    renderRegister();

    expect(screen.getByLabelText(/^nom affiché$/i)).toBeInTheDocument();
    expect(screen.getByText(/votre pseudo/i)).toBeInTheDocument();
  });

  it('says the profile is public by default and links the privacy policy', () => {
    renderRegister();

    expect(screen.getByText(/publics par défaut/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /politique de confidentialité/i })).toHaveAttribute(
      'href',
      '/politique-de-confidentialite'
    );
  });

  it('lets the visitor see the password he types', () => {
    renderRegister();

    expect(screen.getByRole('button', { name: 'Afficher le mot de passe' })).toBeInTheDocument();
  });

  it('n’appelle pas l’API si le mot de passe ne contient pas de chiffre', async () => {
    const user = userEvent.setup();
    let registerPosts = 0;
    server.use(
      authMeGuestHandler,
      http.post(`${TEST_API_V1}/auth/register`, async () => {
        registerPosts += 1;
        return apiJson<'RegisterResponse'>({ userId: 'u1', displayName: 'Alice' }, { status: 201 });
      })
    );

    renderRegister('/register?returnTo=%2F');

    await user.type(screen.getByLabelText(/^nom affiché$/i), 'Sam');
    await user.type(screen.getByLabelText(/^e-mail$/i), 'sam@test.local');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'abcdefgh');
    await user.click(screen.getByRole('button', { name: /créer mon compte/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(registerPosts).toBe(0);
  });
});
