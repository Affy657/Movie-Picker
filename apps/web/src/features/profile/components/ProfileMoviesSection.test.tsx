import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import ProfileMoviesSection from './ProfileMoviesSection';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { stubHoverCapability } from '@/test-utils/matchMedia';
import type { FavoriteTitle } from '@/shared/types/movie';

const HEAT: FavoriteTitle = {
  tmdbId: 949,
  mediaType: 'movie',
  title: 'Heat',
  year: '1995',
  posterPath: null,
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderSection(handle: string, favorites: FavoriteTitle[] = [], withLocation = false) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <ProfileMoviesSection handle={handle} favorites={favorites} />
        {withLocation ? <LocationProbe /> : null}
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfileMoviesSection (MSW)', () => {
  const server = setupServer(
    http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 }))
  );

  beforeAll(() => server.listen({ onUnhandledFrame: 'warn' }));
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

  it('ne rend rien si la liste est vide', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () => HttpResponse.json({ items: [] }))
    );

    const { container } = renderSection('alice');

    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('shows the favorites even when nothing was watched yet', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () => HttpResponse.json({ items: [] }))
    );

    renderSection('alice', [HEAT]);

    expect(await screen.findByRole('heading', { name: 'Ses favoris' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /derniers films vus/i })).not.toBeInTheDocument();
  });

  it('says so when adding a favorite to the watchlist fails', async () => {
    stubHoverCapability();
    server.use(
      authedBobHandler,
      http.get(`${TEST_API_V1}/watchlist`, () => HttpResponse.json({ items: [] })),
      http.post(`${TEST_API_V1}/watchlist`, () =>
        HttpResponse.json({ error: 'Ajout impossible' }, { status: 500 })
      ),
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () => HttpResponse.json({ items: [] }))
    );
    const user = userEvent.setup();

    renderSection('alice', [HEAT]);
    await user.click(await screen.findByRole('button', { name: 'Ajouter « Heat » à ma liste' }));

    expect(await screen.findByText('Ajout impossible')).toHaveAttribute('role', 'alert');
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

  it("wears the owner's rating on the poster, in the reader's scale, and nothing without one", async () => {
    server.use(
      authedBobHandler,
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
              myRating: 7,
            },
            {
              tmdbId: 157336,
              title: 'Interstellar',
              year: '2014',
              posterPath: null,
              genreIds: [],
              mediaType: 'movie',
              watchedAt: '2026-05-01T00:00:00Z',
              myRating: null,
            },
          ],
        })
      )
    );

    renderSection('alice');

    expect(await screen.findByText('Note de @alice : 7/10')).toBeInTheDocument();
    expect(screen.queryAllByText(/^Note de @alice/)).toHaveLength(1);
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

  it('reads the rating and the runtime on the scale of the signed-in account', async () => {
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
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
        HttpResponse.json({
          items: [
            {
              tmdbId: 27205,
              title: 'Inception',
              year: '2010',
              posterPath: null,
              voteAverage: 8.4,
              runtimeMinutes: 148,
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
    expect(await screen.findByText('8,4/10')).toBeInTheDocument();
    expect(screen.getByText('2h28')).toBeInTheDocument();
  });

  it('clicking a poster opens the film page', async () => {
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

    renderSection('alice', [], true);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: /voir les détails de « inception »/i })
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/film/27205-inception');
  });

  it('hover, logged in: the poster offers the library actions and opens the propose modal', async () => {
    stubHoverCapability();
    server.use(
      authedBobHandler,
      http.get(`${TEST_API_V1}/watchlist`, () => HttpResponse.json({ items: [] })),
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] })),
      inceptionHandler
    );

    renderSection('alice');
    const user = userEvent.setup();

    expect(
      await screen.findByRole('button', { name: 'Ajouter « Inception » à ma liste' })
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Proposer « Inception » dans une soirée' })
    );

    expect(
      await screen.findByText(/proposer «\s*inception\s*» dans une soirée/i)
    ).toBeInTheDocument();
  });

  it('hover, guest: the poster offers no library action', async () => {
    stubHoverCapability();
    server.use(inceptionHandler);

    renderSection('alice');

    expect(
      await screen.findByRole('button', { name: 'Voir les détails de « Inception »' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ajouter « Inception » à ma liste' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^proposer/i })).not.toBeInTheDocument();
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
