import { Suspense } from 'react';
import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { AppRoutes } from '@/app/App';
import { resetSessionHintMemoryForTests } from '@/features/auth/session-hint';
import { createEventDetailHandlers, TEST_API_V1 } from '@/mocks/handlers';

const SESSION_HINT_KEY = 'mp.session-hint';
const EVENT_SLUG = 'soiree-invite';
const INVITE_PATH = `/e/${EVENT_SLUG}`;
const LOGIN_PATH = `/login?returnTo=${encodeURIComponent(INVITE_PATH)}`;

const USER = {
  userId: 'u-invite',
  displayName: 'Invité',
  emailMasked: 'i***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
};

function renderRoutes(initialEntries: string[]) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={initialEntries}>
        <Suspense fallback={<p>Loading…</p>}>
          <AppRoutes />
        </Suspense>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe("lien d'invitation : retour vers la soirée après authentification", () => {
  const server = setupServer();
  let sessionActive = false;

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  beforeEach(() => {
    sessionActive = false;
    resetSessionHintMemoryForTests();
    localStorage.setItem('moviepicker-locale', 'fr');
  });
  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
    resetSessionHintMemoryForTests();
    localStorage.clear();
    sessionActive = false;
  });
  afterAll(() => server.close());

  function useInviteHandlers() {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        sessionActive
          ? HttpResponse.json(USER)
          : HttpResponse.json({ error: 'Non authentifié.', code: 401 }, { status: 401 })
      ),
      http.post(`${TEST_API_V1}/auth/login`, () => {
        sessionActive = true;
        return HttpResponse.json({});
      }),
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] })),
      http.get(`${TEST_API_V1}/auth/oauth/providers`, () => HttpResponse.json({ providers: [] })),
      ...createEventDetailHandlers({ slug: EVENT_SLUG, title: 'Soirée invitée' })
    );
  }

  async function submitLoginForm() {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^e-mail$/i), 'invite@test.local');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'abcd1234');
    await user.click(screen.getByRole('button', { name: /^se connecter$/i }));
  }

  function expectEventPage() {
    return waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /soirée invitée/i })).toBeInTheDocument();
      },
      { timeout: 15000 }
    );
  }

  it('connexion depuis le lien : atterrit sur la soirée, pas sur mes soirées', async () => {
    useInviteHandlers();

    renderRoutes([INVITE_PATH]);

    await expectEventPage();
    await userEvent.setup().click(screen.getByRole('link', { name: /^se connecter$/i }));
    await screen.findByRole('heading', { name: /^connexion$/i }, { timeout: 8000 });
    await submitLoginForm();

    await expectEventPage();
    expect(screen.queryByRole('heading', { name: /^mes soirées$/i })).not.toBeInTheDocument();
  }, 25000);

  it('session déjà valide : /login?returnTo renvoie directement sur la soirée sans reclic du lien', async () => {
    sessionActive = true;
    useInviteHandlers();

    renderRoutes([LOGIN_PATH]);

    await expectEventPage();
  }, 25000);

  it('navigation privée : le hint de session non persistable ne renvoie plus en boucle sur /login', async () => {
    useInviteHandlers();
    localStorage.removeItem(SESSION_HINT_KEY);

    const realGetItem = Storage.prototype.getItem;
    const realSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function mockGetItem(
      this: Storage,
      key: string
    ) {
      if (key === SESSION_HINT_KEY) throw new Error('storage indisponible');
      return realGetItem.call(this, key);
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function mockSetItem(
      this: Storage,
      key: string,
      value: string
    ) {
      if (key === SESSION_HINT_KEY) throw new Error('storage indisponible');
      realSetItem.call(this, key, value);
    });

    renderRoutes([INVITE_PATH]);

    await expectEventPage();
    await userEvent.setup().click(screen.getByRole('link', { name: /^se connecter$/i }));
    await screen.findByRole('heading', { name: /^connexion$/i }, { timeout: 8000 });
    await submitLoginForm();

    await expectEventPage();
  });

  it('vérification de session en échec : écran de réessai sur une page protégée', async () => {
    localStorage.setItem(SESSION_HINT_KEY, '1');
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({ error: 'Panne' }, { status: 503 })
      )
    );

    renderRoutes(['/new']);

    expect(
      await screen.findByRole('button', { name: /^réessayer$/i }, { timeout: 12000 })
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^connexion$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour à l.accueil/i })).toHaveAttribute('href', '/');
  });
});
