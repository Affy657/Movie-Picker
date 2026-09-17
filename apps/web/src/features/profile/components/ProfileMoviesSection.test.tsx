import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import ProfileMoviesSection from './ProfileMoviesSection';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { stubHoverCapability } from '@/test-utils/matchMedia';

function renderSection(handle: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <ProfileMoviesSection handle={handle} />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfileMoviesSection (MSW)', () => {
  const server = setupServer(
    http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
    http.get(`${TEST_API_V1}/movies/tmdb/:tmdbId/details`, () =>
      HttpResponse.json({ tmdbId: 27205, title: 'Inception', overview: 'Un voleur de rêves.' })
    )
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  const inceptionHandler = http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
    HttpResponse.json({
      items: [
        {
          tmdbId: 27205,
          title: 'Inception',
          year: '2010',
          posterPath: null,
          genreIds: [28],
          mediaType: 'movie',
          watchedAt: '2026-06-01T00:00:00Z',
        },
      ],
    })
  );

  const authedBobHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
    HttpResponse.json({
      userId: 'u1',
      displayName: 'Bob',
      emailMasked: 'b***@test.local',
      uiTheme: 'system',
      accentColor: 'default',
      ratingScale: 'ten',
    })
  );

  const menuItemNames = () =>
    screen
      .getAllByRole('menuitem')
      .map((item) => item.getAttribute('aria-label') ?? item.textContent?.trim());

  it('ne rend rien si la liste est vide', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () => HttpResponse.json({ items: [] }))
    );

    const { container } = renderSection('alice');

    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('shows the title and the recently watched movies', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
        HttpResponse.json({
          items: [
            {
              tmdbId: 27205,
              title: 'Inception',
              year: '2010',
              posterPath: '/x.jpg',
              genreIds: [28],
              mediaType: 'movie',
              watchedAt: '2026-06-01T00:00:00Z',
            },
            {
              tmdbId: 157336,
              title: 'Interstellar',
              year: '2014',
              posterPath: null,
              genreIds: [],
              mediaType: 'movie',
              watchedAt: '2026-05-01T00:00:00Z',
            },
          ],
        })
      )
    );

    renderSection('alice');

    expect(await screen.findByRole('heading', { name: /derniers films vus/i })).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Interstellar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tout voir/i })).toHaveAttribute(
      'href',
      '/u/alice/films'
    );
  });

  it('renders one unified card per movie with its title as a level-three heading and the year', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
        HttpResponse.json({
          items: [
            {
              tmdbId: 27205,
              title: 'Inception',
              year: '2010',
              posterPath: null,
              genreIds: [28],
              mediaType: 'movie',
              watchedAt: '2026-06-01T00:00:00Z',
            },
          ],
        })
      )
    );

    renderSection('alice');

    expect(await screen.findByRole('heading', { name: 'Inception', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /plus d.actions/i })).not.toBeInTheDocument();
  });

  it('clicking a poster opens the details modal', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
        HttpResponse.json({
          items: [
            {
              tmdbId: 27205,
              title: 'Inception',
              year: '2010',
              posterPath: null,
              genreIds: [28],
              mediaType: 'movie',
              watchedAt: '2026-06-01T00:00:00Z',
            },
          ],
        })
      )
    );

    renderSection('alice');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: /voir les détails de « inception »/i })
    );

    expect(await screen.findByRole('heading', { name: 'Inception', level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter à ma liste' })).not.toBeInTheDocument();
  });

  it('logged in, the details modal carries the library actions and hands over to the propose modal', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u1',
          displayName: 'Bob',
          emailMasked: 'b***@test.local',
          uiTheme: 'system',
          accentColor: 'default',
          ratingScale: 'ten',
        })
      ),
      http.get(`${TEST_API_V1}/watchlist`, () => HttpResponse.json({ items: [] })),
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] })),
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
        HttpResponse.json({
          items: [
            {
              tmdbId: 27205,
              title: 'Inception',
              year: '2010',
              posterPath: null,
              genreIds: [28],
              mediaType: 'movie',
              watchedAt: '2026-06-01T00:00:00Z',
            },
          ],
        })
      )
    );

    renderSection('alice');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: /voir les détails de « inception »/i })
    );
    await screen.findByRole('heading', { name: 'Inception', level: 2 });

    expect(await screen.findByRole('button', { name: 'Ajouter à ma liste' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Proposer dans une soirée' }));

    expect(
      await screen.findByText(/proposer «\s*inception\s*» dans une soirée/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Inception', level: 2 })).not.toBeInTheDocument();
  });

  it('hover, logged in: the card kebab lists the library actions and opens the propose modal', async () => {
    stubHoverCapability();
    server.use(
      authedBobHandler,
      http.get(`${TEST_API_V1}/watchlist`, () => HttpResponse.json({ items: [] })),
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] })),
      inceptionHandler
    );

    renderSection('alice');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: /plus d’actions pour «\s*inception\s*»/i })
    );

    expect(menuItemNames()).toEqual([
      'Voir les détails',
      'Ajouter à ma liste',
      'Proposer dans une soirée',
      'Ouvrir sur Letterboxd',
    ]);

    await user.click(screen.getByRole('menuitem', { name: 'Proposer dans une soirée' }));

    expect(
      await screen.findByText(/proposer «\s*inception\s*» dans une soirée/i)
    ).toBeInTheDocument();
  });

  it('hover, guest: the kebab keeps only the details and Letterboxd', async () => {
    stubHoverCapability();
    server.use(inceptionHandler);

    renderSection('alice');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: /plus d’actions pour «\s*inception\s*»/i })
    );

    expect(menuItemNames()).toEqual(['Voir les détails', 'Ouvrir sur Letterboxd']);
  });

  it('affiche un film sans affiche via le placeholder', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/bob/watched-movies`, () =>
        HttpResponse.json({
          items: [
            {
              tmdbId: 1,
              title: 'Sans affiche',
              year: '2020',
              posterPath: null,
              genreIds: [],
              mediaType: 'movie',
              watchedAt: '2026-01-01T00:00:00Z',
            },
          ],
        })
      )
    );

    renderSection('bob');

    expect(await screen.findByText('Sans affiche')).toBeInTheDocument();
  });
});
