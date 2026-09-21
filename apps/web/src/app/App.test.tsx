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
import { WHATS_NEW_NAV_RELEASED_AT_MS } from '@/shared/whatsNew';

const HOUR_MS = 60 * 60 * 1000;
const DAY_AFTER_RELEASE_MS = WHATS_NEW_NAV_RELEASED_AT_MS + 36 * HOUR_MS;

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
    handle: 'alice',
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
          { timeout: 20000 }
        )
      ).toBeInTheDocument();
      const main = screen.getByRole('main');
      for (const link of within(main).getAllByRole('link', { name: /^se connecter$/i })) {
        expect(link).toHaveAttribute('href', '/login');
      }
      for (const link of within(main).getAllByRole('link', { name: /^créer un compte$/i })) {
        expect(link).toHaveAttribute('href', '/register');
      }
    });

    it('AppShell : la landing remplace la navigation applicative par ses ancres', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/decouvrir']);
      await screen.findByRole(
        'heading',
        { name: /choisissez le film de la soirée/i, level: 1 },
        { timeout: 20000 }
      );
      const banner = screen.getByRole('banner');
      expect(within(banner).getByRole('link', { name: /comment ça marche/i })).toHaveAttribute(
        'href',
        '#parcours'
      );
      expect(
        within(banner).queryByRole('link', { name: /^mes soirées$/i })
      ).not.toBeInTheDocument();
      expect(screen.getAllByRole('navigation', { name: /navigation principale/i })).toHaveLength(1);
    });

    it("route / affiche la home d'exploration, plus la landing", async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/']);
      expect(
        await screen.findByRole(
          'heading',
          { name: /on regarde ce soir/i, level: 1 },
          { timeout: 20000 }
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /choisissez le film de la soirée/i })
      ).not.toBeInTheDocument();
    });

    it('AppShell: the home leads to the landing through the nav and the footer', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/']);
      await screen.findByRole(
        'heading',
        { name: /on regarde ce soir/i, level: 1 },
        { timeout: 20000 }
      );
      const banner = screen.getByRole('banner');
      expect(within(banner).getByRole('link', { name: /comment ça marche/i })).toHaveAttribute(
        'href',
        '/decouvrir'
      );
      const contentinfo = screen.getByRole('contentinfo');
      expect(within(contentinfo).getByRole('link', { name: /comment ça marche/i })).toHaveAttribute(
        'href',
        '/decouvrir'
      );
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
        const main = await waitFor(() => screen.getByRole('main'), { timeout: 20000 });
        const loginLink = await within(main).findByRole(
          'link',
          { name: /^se connecter$/i },
          { timeout: 20000 }
        );
        expect(loginLink).toHaveAttribute('href', `/login?returnTo=${encodedReturnTo}`);
        expect(within(main).getByRole('link', { name: /^créer un compte$/i })).toHaveAttribute(
          'href',
          `/register?returnTo=${encodedReturnTo}`
        );
        expect(screen.queryByRole('heading', { name: /^connexion$/i })).not.toBeInTheDocument();
      }
    );

    it('the /settings route shows the visitor preferences with a sign-in CTA', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/settings']);
      expect(
        await screen.findByRole('heading', { name: /^paramètres$/i, level: 1 }, { timeout: 20000 })
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
      expect(
        await screen.findByRole('heading', { name: heading, level: 1 }, { timeout: 20000 })
      ).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /^connexion$/i })).not.toBeInTheDocument();
    });

    it('the /e/:slug movie night is reachable without an account, with a CTA to join', async () => {
      server.use(
        authMeGuestHandler,
        ...createEventDetailHandlers({ slug: 'soiree-secrete', title: 'Soirée secrète' })
      );
      renderRoutes(['/e/soiree-secrete']);
      expect(
        await screen.findByRole('heading', { name: /soirée secrète/i }, { timeout: 20000 })
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
        await screen.findByRole('heading', { name: 'Alice' }, { timeout: 20000 })
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
          { timeout: 20000 }
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /^connexion$/i })).not.toBeInTheDocument();
    });

    it('AppShell: the main navigation is exposed to signed-out visitors', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/']);
      await screen.findByRole(
        'heading',
        { name: /on regarde ce soir/i, level: 1 },
        { timeout: 20000 }
      );
      const navs = screen.getAllByRole('navigation', { name: /navigation principale/i });
      expect(navs.length).toBeGreaterThan(0);
      const mobileNav = navs.at(-1);
      if (!mobileNav) throw new Error('Mobile nav introuvable');
      const labels = within(mobileNav)
        .getAllByRole('link')
        .map((link) => link.textContent?.trim());
      expect(labels).toEqual(['Explorer', 'Soirées', 'Créer', 'Ma liste', 'Connexion']);
      expect(within(mobileNav).getByRole('link', { name: /^Connexion$/i })).toHaveAttribute(
        'href',
        '/login'
      );
      const desktopNav = navs.at(0);
      if (!desktopNav) throw new Error('Nav bureau introuvable');
      expect(within(desktopNav).getByRole('link', { name: /^Mes soirées$/i })).toHaveAttribute(
        'href',
        '/my-events'
      );
    });

    it('AppShell : les boutons de connexion et inscription remplacent la cloche et le menu du compte', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/']);
      await screen.findByRole(
        'heading',
        { name: /on regarde ce soir/i, level: 1 },
        { timeout: 20000 }
      );
      const banner = screen.getByRole('banner');
      await waitFor(() => {
        expect(within(banner).getByRole('link', { name: /^se connecter$/i })).toHaveAttribute(
          'href',
          '/login'
        );
      });
      expect(within(banner).getByRole('link', { name: /^créer un compte$/i })).toHaveAttribute(
        'href',
        '/register'
      );
      expect(screen.queryByRole('button', { name: /menu du compte/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^notifications$/i })).not.toBeInTheDocument();
    });

    it(`AppShell: no "What's new" link is exposed to signed-out visitors`, async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/']);
      await screen.findByRole(
        'heading',
        { name: /on regarde ce soir/i, level: 1 },
        { timeout: 20000 }
      );
      expect(screen.queryByRole('button', { name: /nouveautés/i })).not.toBeInTheDocument();
    });
  });

  describe('signed-in user', () => {
    it("route / sert la page d'exploration au lieu de rediriger", async () => {
      server.use(
        authedUserHandler,
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/']);
      expect(
        await screen.findByRole(
          'heading',
          { name: /on regarde ce soir/i, level: 1 },
          { timeout: 20000 }
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /^mes soirées$/i, level: 1 })
      ).not.toBeInTheDocument();
    });

    it('exposes Explore in the nav once signed in', async () => {
      server.use(
        authedUserHandler,
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/my-events']);
      const exploreLinks = await screen.findAllByRole('link', { name: /explorer/i });
      expect(exploreLinks.length).toBeGreaterThan(0);
      for (const link of exploreLinks) {
        expect(link).toHaveAttribute('href', '/');
      }
    });

    it('AppShell exposes My movie nights and the creation shortcut in the nav (Settings lives in the avatar menu)', async () => {
      server.use(
        authedUserHandler,
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/my-events']);
      await screen.findByRole('button', { name: /menu du compte/i }, { timeout: 20000 });
      const navs = screen.getAllByRole('navigation', { name: /navigation principale/i });
      expect(navs).toHaveLength(2);
      const mobileNav = navs.at(-1);
      if (!mobileNav) throw new Error('Mobile nav introuvable');
      expect(within(mobileNav).queryByRole('link', { name: /^Accueil$/i })).not.toBeInTheDocument();
      expect(within(mobileNav).getByRole('link', { name: /^Soirées$/i })).toHaveAttribute(
        'href',
        '/my-events'
      );
      expect(
        within(mobileNav).queryByRole('link', { name: /^Mes soirées$/i })
      ).not.toBeInTheDocument();
      expect(within(mobileNav).getByRole('link', { name: /^Créer$/i })).toHaveAttribute(
        'href',
        '/new'
      );
      expect(
        within(mobileNav).queryByRole('link', { name: /^Nouvelle soirée$/i })
      ).not.toBeInTheDocument();
      const desktopNav = navs.at(0);
      if (!desktopNav) throw new Error('Nav bureau introuvable');
      expect(within(desktopNav).getByRole('link', { name: /^Nouvelle soirée$/i })).toHaveAttribute(
        'href',
        '/new'
      );
      expect(within(desktopNav).getByRole('link', { name: /^Mes soirées$/i })).toHaveAttribute(
        'href',
        '/my-events'
      );
      expect(
        within(mobileNav).queryByRole('link', { name: /^Paramètres$/i })
      ).not.toBeInTheDocument();
      const labels = within(mobileNav)
        .getAllByRole('link')
        .map((link) => link.textContent?.trim());
      expect(labels).toEqual(['Explorer', 'Soirées', 'Créer', 'Ma liste', 'Profil']);
      expect(within(mobileNav).getByRole('link', { name: /^Profil$/i })).toHaveAttribute(
        'href',
        '/u/alice'
      );
    });

    it(`AppShell exposes the "What's new" link in the footer for signed-in users`, async () => {
      server.use(
        authedUserHandler,
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/my-events']);
      await screen.findByRole('button', { name: /menu du compte/i }, { timeout: 20000 });
      expect(screen.getByRole('button', { name: /^nouveautés$/i })).toBeInTheDocument();
    });

    it("AppShell exposes the What's new badge before the notifications for an older account", async () => {
      vi.spyOn(Date, 'now').mockReturnValue(DAY_AFTER_RELEASE_MS);
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
        { timeout: 20000 }
      );
      const bell = screen.getByRole('link', { name: /^notifications$/i });
      expect(chip.compareDocumentPosition(bell) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("AppShell does not expose the What's new badge for an account created after the release", async () => {
      vi.spyOn(Date, 'now').mockReturnValue(DAY_AFTER_RELEASE_MS);
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () =>
          HttpResponse.json({
            userId: 'u1',
            displayName: 'Alice',
            emailMasked: 'a***@test.local',
            uiTheme: 'system',
            accentColor: 'default',
            createdAt: new Date(WHATS_NEW_NAV_RELEASED_AT_MS + 30 * HOUR_MS).toISOString(),
          })
        ),
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/my-events']);
      await screen.findByRole('button', { name: /menu du compte/i }, { timeout: 20000 });
      expect(
        screen.queryByRole('button', { name: /voir les nouveautés/i })
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^nouveautés$/i })).toBeInTheDocument();
    });
  });

  it('the brand always leads to the site root', async () => {
    server.use(authMeGuestHandler);
    renderRoutes(['/']);
    await screen.findByRole(
      'heading',
      { name: /on regarde ce soir/i, level: 1 },
      { timeout: 20000 }
    );
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /movie picker, accueil/i })).toHaveAttribute(
        'href',
        '/'
      );
    });
  });
});
