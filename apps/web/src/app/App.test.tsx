import { Suspense } from 'react';
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { AppRoutes } from '@/app/App';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';

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

const authedUserHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
  })
);

describe('App (routes)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
  });
  afterAll(() => server.close());

  describe('visiteur anonyme', () => {
    it("route / affiche la landing publique avec les CTA d'authentification", async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/']);
      expect(
        await screen.findByRole(
          'heading',
          { name: /choisissez le film de la soirée/i, level: 1 },
          { timeout: 8000 }
        )
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^se connecter$/i })).toHaveAttribute(
        'href',
        '/login'
      );
      expect(screen.getByRole('link', { name: /^créer un compte$/i })).toHaveAttribute(
        'href',
        '/register'
      );
    });

    it.each([
      ['/new', '%2Fnew'],
      ['/my-events', '%2Fmy-events'],
      ['/e/soiree-secrete', '%2Fe%2Fsoiree-secrete'],
      ['/settings', '%2Fsettings'],
    ])('route %s redirige vers /login avec un returnTo', async (path, encodedReturnTo) => {
      server.use(
        authMeGuestHandler,
        http.get(`${TEST_API_V1}/auth/oauth/providers`, () => HttpResponse.json({ providers: [] }))
      );
      renderRoutes([path]);
      expect(
        await screen.findByRole('heading', { name: /^connexion$/i }, { timeout: 8000 })
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /créer un compte/i })).toHaveAttribute(
        'href',
        `/register?returnTo=${encodedReturnTo}`
      );
    });

    it("AppShell : aucune barre de navigation n'est exposée aux non-connectés", async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/']);
      await screen.findByRole(
        'heading',
        { name: /choisissez le film de la soirée/i, level: 1 },
        { timeout: 8000 }
      );
      expect(
        screen.queryByRole('navigation', { name: /navigation principale/i })
      ).not.toBeInTheDocument();
    });

    it("AppShell : aucun lien « Nouveautés » n'est exposé aux non-connectés", async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/']);
      await screen.findByRole(
        'heading',
        { name: /choisissez le film de la soirée/i, level: 1 },
        { timeout: 8000 }
      );
      expect(screen.queryByRole('button', { name: /nouveautés/i })).not.toBeInTheDocument();
    });
  });

  describe('utilisateur connecté', () => {
    it('route / redirige vers /my-events', async () => {
      server.use(
        authedUserHandler,
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/']);
      expect(
        await screen.findByRole('heading', { name: /^mes soirées$/i, level: 1 }, { timeout: 8000 })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /choisissez le film de la soirée/i })
      ).not.toBeInTheDocument();
    });

    it('AppShell expose Mes soirées + Nouvelle soirée dans la nav (Mon compte est dans le menu avatar)', async () => {
      server.use(
        authedUserHandler,
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/my-events']);
      await screen.findByRole('heading', { name: /^mes soirées$/i, level: 1 }, { timeout: 8000 });
      const navs = screen.getAllByRole('navigation', { name: /navigation principale/i });
      expect(navs).toHaveLength(2);
      const mobileNav = navs.at(-1);
      if (!mobileNav) throw new Error('Mobile nav introuvable');
      expect(within(mobileNav).queryByRole('link', { name: /^Accueil$/i })).not.toBeInTheDocument();
      expect(within(mobileNav).getByRole('link', { name: /^Mes soirées$/i })).toBeInTheDocument();
      expect(
        within(mobileNav).getByRole('link', { name: /^Nouvelle soirée$/i })
      ).toBeInTheDocument();
      expect(
        within(mobileNav).queryByRole('link', { name: /^Mon compte$/i })
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /menu du compte/i })).toBeInTheDocument();
    });

    it('AppShell expose le lien « Nouveautés » dans le pied de page pour les connectés', async () => {
      server.use(
        authedUserHandler,
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/my-events']);
      await screen.findByRole('heading', { name: /^mes soirées$/i, level: 1 }, { timeout: 8000 });
      expect(screen.getByRole('button', { name: /^nouveautés$/i })).toBeInTheDocument();
    });

    it('AppShell expose la pastille Nouveautés devant les notifications pour un compte 1.3.x', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-26T12:00:00.000Z'));
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () =>
          HttpResponse.json({
            userId: 'u1',
            displayName: 'Alice',
            emailMasked: 'a***@test.local',
            uiTheme: 'system',
            accentColor: 'default',
            createdAt: '2026-06-01T00:00:00.000Z',
          })
        ),
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] })),
        http.get(`${TEST_API_V1}/notifications/inbox`, () =>
          HttpResponse.json({ items: [], unreadCount: 0 })
        )
      );
      renderRoutes(['/my-events']);
      await screen.findByRole('heading', { name: /^mes soirées$/i, level: 1 }, { timeout: 8000 });
      const chip = screen.getByRole('button', { name: /voir les nouveautés/i });
      const bell = screen.getByRole('link', { name: /^notifications$/i });
      expect(chip.compareDocumentPosition(bell) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("AppShell n'expose pas la pastille Nouveautés pour un compte créé à partir de la 1.4.0", async () => {
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-26T12:00:00.000Z'));
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () =>
          HttpResponse.json({
            userId: 'u1',
            displayName: 'Alice',
            emailMasked: 'a***@test.local',
            uiTheme: 'system',
            accentColor: 'default',
            createdAt: '2026-08-25T12:00:00.000Z',
          })
        ),
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/my-events']);
      await screen.findByRole('heading', { name: /^mes soirées$/i, level: 1 }, { timeout: 8000 });
      expect(
        screen.queryByRole('button', { name: /voir les nouveautés/i })
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^nouveautés$/i })).toBeInTheDocument();
    });
  });

  it('le brand mène toujours à la racine du site', async () => {
    server.use(authMeGuestHandler);
    renderRoutes(['/']);
    await screen.findByRole(
      'heading',
      { name: /choisissez le film de la soirée/i, level: 1 },
      { timeout: 8000 }
    );
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /movie picker .*accueil/i })).toHaveAttribute(
        'href',
        '/'
      );
    });
  });
});
