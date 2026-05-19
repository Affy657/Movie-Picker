import { Suspense } from 'react';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
  afterEach(() => server.resetHandlers());
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

    it('route /new redirige vers /login avec un returnTo', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/new']);
      expect(await screen.findByRole('heading', { name: /^connexion$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /créer un compte/i })).toHaveAttribute(
        'href',
        '/register?returnTo=%2Fnew'
      );
    });

    it('route /my-events redirige vers /login avec un returnTo', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/my-events']);
      expect(await screen.findByRole('heading', { name: /^connexion$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /créer un compte/i })).toHaveAttribute(
        'href',
        '/register?returnTo=%2Fmy-events'
      );
    });

    it('route /e/:slug redirige vers /login avec un returnTo (lien de partage)', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/e/soiree-secrete']);
      expect(await screen.findByRole('heading', { name: /^connexion$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /créer un compte/i })).toHaveAttribute(
        'href',
        '/register?returnTo=%2Fe%2Fsoiree-secrete'
      );
    });

    it('route /settings redirige vers /login avec un returnTo', async () => {
      server.use(authMeGuestHandler);
      renderRoutes(['/settings']);
      expect(await screen.findByRole('heading', { name: /^connexion$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /créer un compte/i })).toHaveAttribute(
        'href',
        '/register?returnTo=%2Fsettings'
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
  });

  describe('utilisateur connecté', () => {
    it('route / redirige vers /my-events', async () => {
      server.use(
        authedUserHandler,
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/']);
      expect(
        await screen.findByRole('heading', { name: /^mes soirées$/i, level: 1 })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /choisissez le film de la soirée/i })
      ).not.toBeInTheDocument();
    });

    it('AppShell expose Mes soirées + Mon compte dans la nav (sans Accueil)', async () => {
      server.use(
        authedUserHandler,
        http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
      );
      renderRoutes(['/my-events']);
      await screen.findByRole('heading', { name: /^mes soirées$/i, level: 1 });
      const navs = screen.getAllByRole('navigation', { name: /navigation principale/i });
      expect(navs).toHaveLength(2);
      const mobileNav = navs.at(-1);
      if (!mobileNav) throw new Error('Mobile nav introuvable');
      expect(within(mobileNav).queryByRole('link', { name: /^Accueil$/i })).not.toBeInTheDocument();
      expect(within(mobileNav).getByRole('link', { name: /^Mes soirées$/i })).toBeInTheDocument();
      expect(within(mobileNav).getByRole('link', { name: /^Mon compte$/i })).toBeInTheDocument();
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
