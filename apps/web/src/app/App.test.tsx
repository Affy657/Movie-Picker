import { Suspense } from 'react';
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { AppRoutes } from '@/app/App';
import {
  authMeGuestHandler,
  createEventDetailHandlers,
  createUserStatsHandler,
  TEST_API_V1,
} from '@/mocks/handlers';

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
    it("route /decouvrir affiche la landing publique avec les CTA d'authentification", async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/decouvrir']);
      expect(
        await screen.findByRole(
          'heading',
          { name: /choisissez le film de la soirée/i, level: 1 },
          { timeout: 8000 }
        )
      ).toBeInTheDocument();
      const main = screen.getByRole('main');
      expect(within(main).getByRole('link', { name: /^se connecter$/i })).toHaveAttribute(
        'href',
        '/login'
      );
      expect(within(main).getByRole('link', { name: /^créer un compte$/i })).toHaveAttribute(
        'href',
        '/register'
      );
    });

    it('route / redirige vers Mes soirées, à l’état déconnecté', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/']);
      expect(
        await screen.findByRole('heading', { name: /^mes soirées$/i, level: 1 }, { timeout: 8000 })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /choisissez le film de la soirée/i })
      ).not.toBeInTheDocument();
    });

    it.each([
      ['/new', '%2Fnew'],
      ['/my-events', '%2Fmy-events'],
      ['/watchlist', '%2Fwatchlist'],
      ['/notifications', '%2Fnotifications'],
    ])(
      'route %s reste accessible sans compte, avec un CTA de connexion (returnTo=%s)',
      async (path, encodedReturnTo) => {
        server.use(authMeGuestHandler);
        renderRoutes([path]);
        const main = await waitFor(() => screen.getByRole('main'), { timeout: 8000 });
        const loginLink = await within(main).findByRole(
          'link',
          { name: /^se connecter$/i },
          { timeout: 8000 }
        );
        expect(loginLink).toHaveAttribute('href', `/login?returnTo=${encodedReturnTo}`);
        expect(within(main).getByRole('link', { name: /^créer un compte$/i })).toHaveAttribute(
          'href',
          `/register?returnTo=${encodedReturnTo}`
        );
        expect(screen.queryByRole('heading', { name: /^connexion$/i })).not.toBeInTheDocument();
      }
    );

    it('route /settings affiche les préférences visiteur avec un CTA de connexion', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/settings']);
      expect(
        await screen.findByRole('heading', { name: /^paramètres$/i, level: 1 }, { timeout: 8000 })
      ).toBeInTheDocument();
      const main = screen.getByRole('main');
      expect(within(main).getByRole('link', { name: /^se connecter$/i })).toHaveAttribute(
        'href',
        '/login?returnTo=%2Fsettings'
      );
      expect(within(main).getByRole('link', { name: /créer un compte/i })).toHaveAttribute(
        'href',
        '/register?returnTo=%2Fsettings'
      );
    });

    it.each([
      ['/mentions-legales', /mentions légales/i],
      ['/politique-de-confidentialite', /politique de confidentialité/i],
      ['/soutenir', /soutenir movie picker/i],
    ])('page %s reste accessible sans compte', async (path, heading) => {
      server.use(authMeGuestHandler);
      renderRoutes([path]);
      expect(await screen.findByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /^connexion$/i })).not.toBeInTheDocument();
    });

    it('soirée /e/:slug accessible sans compte, avec CTA pour rejoindre', async () => {
      server.use(
        authMeGuestHandler,
        ...createEventDetailHandlers({ slug: 'soiree-secrete', title: 'Soirée secrète' })
      );
      renderRoutes(['/e/soiree-secrete']);
      expect(
        await screen.findByRole('heading', { name: /soirée secrète/i }, { timeout: 8000 })
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /rejoindre la soirée/i })).toBeInTheDocument();
      const main = screen.getByRole('main');
      expect(within(main).getByRole('link', { name: /^se connecter$/i })).toHaveAttribute(
        'href',
        `/login?returnTo=${encodeURIComponent('/e/soiree-secrete')}`
      );
      expect(within(main).getByRole('link', { name: /^créer un compte$/i })).toHaveAttribute(
        'href',
        `/register?returnTo=${encodeURIComponent('/e/soiree-secrete')}`
      );
      expect(screen.queryByRole('heading', { name: /^connexion$/i })).not.toBeInTheDocument();
    });

    it('profil public /u/:handle accessible sans compte', async () => {
      server.use(
        authMeGuestHandler,
        http.get(`${TEST_API_V1}/users/alice`, () =>
          HttpResponse.json({
            handle: 'alice',
            displayName: 'Alice',
            avatarId: 'alpha',
            bio: 'Grande cinéphile',
            memberSince: '2024-03-15T00:00:00Z',
            followingCount: 3,
            followersCount: 7,
            isSupporter: false,
            isFollowedByMe: null,
          })
        ),
        createUserStatsHandler('alice'),
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          HttpResponse.json({ items: [] })
        )
      );
      renderRoutes(['/u/alice']);
      expect(
        await screen.findByRole('heading', { name: 'Alice' }, { timeout: 8000 })
      ).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /^connexion$/i })).not.toBeInTheDocument();
    });

    it('films vus /u/:handle/films accessible sans compte', async () => {
      server.use(
        authMeGuestHandler,
        http.get(`${TEST_API_V1}/users/alice`, () =>
          HttpResponse.json({
            handle: 'alice',
            displayName: 'Alice',
            avatarId: 'alpha',
            bio: null,
            memberSince: '2024-03-15T00:00:00Z',
            followingCount: 0,
            followersCount: 0,
            isSupporter: false,
            isFollowedByMe: null,
          })
        ),
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          HttpResponse.json({ items: [] })
        )
      );
      renderRoutes(['/u/alice/films']);
      expect(
        await screen.findByRole(
          'heading',
          { name: /les films vus par alice/i, level: 1 },
          { timeout: 8000 }
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /^connexion$/i })).not.toBeInTheDocument();
    });

    it('AppShell : la navigation principale est exposée aux non-connectés', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/decouvrir']);
      await screen.findByRole(
        'heading',
        { name: /choisissez le film de la soirée/i, level: 1 },
        { timeout: 8000 }
      );
      expect(
        screen.queryAllByRole('navigation', { name: /navigation principale/i }).length
      ).toBeGreaterThan(0);
    });

    it('AppShell : les boutons de connexion et inscription remplacent la cloche et le menu du compte', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/decouvrir']);
      await screen.findByRole(
        'heading',
        { name: /choisissez le film de la soirée/i, level: 1 },
        { timeout: 8000 }
      );
      const loginLinks = await waitFor(() => {
        const links = screen.getAllByRole('link', { name: /^se connecter$/i });
        expect(links.length).toBeGreaterThan(1);
        return links;
      });
      const headerLoginLink = loginLinks.find((el) =>
        el.getAttribute('href')?.includes('returnTo=')
      );
      expect(headerLoginLink).toHaveAttribute(
        'href',
        `/login?returnTo=${encodeURIComponent('/decouvrir')}`
      );
      const registerLinks = screen.getAllByRole('link', { name: /^créer un compte$/i });
      const headerRegisterLink = registerLinks.find((el) =>
        el.getAttribute('href')?.includes('returnTo=')
      );
      expect(headerRegisterLink).toHaveAttribute(
        'href',
        `/register?returnTo=${encodeURIComponent('/decouvrir')}`
      );
      expect(screen.queryByRole('button', { name: /menu du compte/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^notifications$/i })).not.toBeInTheDocument();
    });

    it("AppShell : aucun lien « Nouveautés » n'est exposé aux non-connectés", async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/decouvrir']);
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

    it('AppShell expose Mes soirées + Nouvelle soirée dans la nav (Paramètres est dans le menu avatar)', async () => {
      server.use(
        authedUserHandler,
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/my-events']);
      await screen.findByRole('button', { name: /menu du compte/i }, { timeout: 8000 });
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
        within(mobileNav).queryByRole('link', { name: /^Paramètres$/i })
      ).not.toBeInTheDocument();
    });

    it('AppShell expose le lien « Nouveautés » dans le pied de page pour les connectés', async () => {
      server.use(
        authedUserHandler,
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/my-events']);
      await screen.findByRole('button', { name: /menu du compte/i }, { timeout: 8000 });
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
      const chip = await screen.findByRole(
        'button',
        { name: /voir les nouveautés/i },
        { timeout: 8000 }
      );
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
      await screen.findByRole('button', { name: /menu du compte/i }, { timeout: 8000 });
      expect(
        screen.queryByRole('button', { name: /voir les nouveautés/i })
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^nouveautés$/i })).toBeInTheDocument();
    });
  });

  it('le brand mène toujours à la racine du site', async () => {
    server.use(authMeGuestHandler);
    renderRoutes(['/decouvrir']);
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
