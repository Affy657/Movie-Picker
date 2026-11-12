import type { ComponentProps } from 'react';
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { delay, http, HttpResponse } from 'msw';
import ProfileMoviesSection from './ProfileMoviesSection';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { stubHoverCapability, stubMatchMedia } from '@/test-utils/matchMedia';
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

function renderSection(
  handle: string,
  favorites: FavoriteTitle[] = [],
  extra: Partial<ComponentProps<typeof ProfileMoviesSection>> = {},
  withLocation = false
) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <ProfileMoviesSection handle={handle} favorites={favorites} {...extra} />
        {withLocation ? <LocationProbe /> : null}
      </MemoryRouter>
    </AppTestProviders>
  );
}

function watched(tmdbId: number, title: string, watchedAt: string) {
  return {
    tmdbId,
    title,
    year: '2010',
    posterPath: null,
    genreIds: [],
    mediaType: 'movie',
    watchedAt,
  };
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
    expect(screen.queryByRole('heading', { name: /^films vus/i })).not.toBeInTheDocument();
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

    expect(await screen.findByRole('heading', { name: 'Films vus 2' })).toBeInTheDocument();
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

    renderSection('alice', [], {}, true);
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

  it('shows each title once, at its latest viewing, while the count keeps every viewing', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
        HttpResponse.json({
          items: [
            watched(27205, 'Inception', '2026-06-01T00:00:00Z'),
            watched(949, 'Heat', '2026-05-01T00:00:00Z'),
            watched(27205, 'Inception', '2026-04-01T00:00:00Z'),
          ],
        })
      )
    );

    renderSection('alice');

    expect(await screen.findByRole('heading', { name: 'Films vus 3' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Inception', level: 3 })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Heat', level: 3 })).toBeInTheDocument();
  });

  it('keeps the preview to eight titles and leaves the rest to the full list', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
        HttpResponse.json({
          items: Array.from({ length: 10 }, (_, i) =>
            watched(i + 1, `Film ${i + 1}`, `2026-06-${String(20 - i).padStart(2, '0')}T00:00:00Z`)
          ),
        })
      )
    );

    renderSection('alice');

    expect(await screen.findByRole('heading', { name: 'Films vus 10' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Film 8', level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Film 9', level: 3 })).not.toBeInTheDocument();
  });

  it('asks the API for a small page of viewings, not the whole history', async () => {
    const requestedTakes: Array<string | null> = [];
    server.use(
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, ({ request }) => {
        requestedTakes.push(new URL(request.url).searchParams.get('take'));
        return HttpResponse.json({ items: [watched(949, 'Heat', '2026-05-01T00:00:00Z')] });
      })
    );

    renderSection('alice');

    await screen.findByRole('heading', { name: 'Films vus 1' });
    expect(requestedTakes).toEqual(['24']);
  });

  it('counts every viewing from the total the API reports, beyond the page it sends', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
        HttpResponse.json({ items: [watched(949, 'Heat', '2026-05-01T00:00:00Z')], total: 250 })
      )
    );

    renderSection('alice');

    expect(await screen.findByRole('heading', { name: 'Films vus 250' })).toBeInTheDocument();
  });

  it('says the watched movies could not load and loads them again on demand', async () => {
    let calls = 0;
    server.use(
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () => {
        calls += 1;
        if (calls === 1) return HttpResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
        return HttpResponse.json({ items: [watched(949, 'Heat', '2026-05-01T00:00:00Z')] });
      })
    );
    const user = userEvent.setup();

    renderSection('alice');

    expect(await screen.findByText('Les films vus n’ont pas pu être chargés.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByRole('heading', { name: 'Films vus 1' })).toBeInTheDocument();
    expect(screen.queryByText('Les films vus n’ont pas pu être chargés.')).not.toBeInTheDocument();
  });

  it('on a phone, reads the favorites, then the watched movies, then the watchlist', async () => {
    stubMatchMedia((query) => query.includes('767px'));
    server.use(
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
        HttpResponse.json({ items: [watched(27205, 'Inception', '2026-06-01T00:00:00Z')] })
      ),
      http.get(`${TEST_API_V1}/users/alice/watchlist`, () =>
        HttpResponse.json({ items: [], total: 1, hasMore: false })
      )
    );

    renderSection('alice', [HEAT], { watchlist: { count: 1, isHidden: false } });

    const favorites = await screen.findByRole('heading', { name: 'Ses favoris' });
    const watchedRow = await screen.findByRole('heading', { name: 'Films vus 1' });
    const watchlistRow = screen.getByRole('link', { name: /sa watchlist/i });
    expect(
      favorites.compareDocumentPosition(watchedRow) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      watchedRow.compareDocumentPosition(watchlistRow) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  describe('watchlist preview', () => {
    const watchlistPage = http.get(`${TEST_API_V1}/users/alice/watchlist`, ({ request }) => {
      const take = new URL(request.url).searchParams.get('take');
      return HttpResponse.json({
        items: [
          {
            tmdbId: 438631,
            mediaType: 'movie',
            title: 'Dune',
            year: '2021',
            posterPath: null,
            genreIds: [878],
            createdAt: '2026-06-01T00:00:00Z',
          },
        ],
        total: 12,
        hasMore: take !== null,
      });
    });

    it('shows a visitor the latest titles of the watchlist with its count and a way to the full list', async () => {
      server.use(
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          HttpResponse.json({ items: [] })
        ),
        watchlistPage
      );

      renderSection('alice', [], { watchlist: { count: 12, isHidden: false } });

      expect(await screen.findByRole('heading', { name: 'Sa watchlist 12' })).toBeInTheDocument();
      expect(await screen.findByRole('heading', { name: 'Dune', level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /tout voir sa watchlist/i })).toHaveAttribute(
        'href',
        '/u/alice/watchlist'
      );
    });

    it('holds the place of the posters while the watchlist loads', async () => {
      server.use(
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          HttpResponse.json({ items: [] })
        ),
        http.get(`${TEST_API_V1}/users/alice/watchlist`, async () => {
          await delay('infinite');
          return HttpResponse.json({ items: [], total: 12, hasMore: false });
        })
      );

      renderSection('alice', [], { watchlist: { count: 12, isHidden: false } });

      await screen.findByRole('heading', { name: 'Sa watchlist 12' });
      expect(screen.getByRole('status')).toHaveTextContent('Chargement de la watchlist…');
    });

    it('says the watchlist could not load and loads it again on demand', async () => {
      let calls = 0;
      server.use(
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          HttpResponse.json({ items: [] })
        ),
        http.get(`${TEST_API_V1}/users/alice/watchlist`, () => {
          calls += 1;
          if (calls === 1) return HttpResponse.json({ error: 'Erreur' }, { status: 500 });
          return HttpResponse.json({
            items: [
              {
                tmdbId: 438631,
                mediaType: 'movie',
                title: 'Dune',
                year: '2021',
                posterPath: null,
                genreIds: [878],
                createdAt: '2026-06-01T00:00:00Z',
              },
            ],
            total: 12,
            hasMore: true,
          });
        })
      );
      const user = userEvent.setup();

      renderSection('alice', [], { watchlist: { count: 12, isHidden: false } });

      expect(await screen.findByText('La watchlist n’a pas pu être chargée.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Réessayer' }));

      expect(await screen.findByRole('heading', { name: 'Dune', level: 3 })).toBeInTheDocument();
      expect(screen.queryByText('La watchlist n’a pas pu être chargée.')).not.toBeInTheDocument();
    });

    it('shows nothing to a visitor when the watchlist is empty', async () => {
      server.use(
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          HttpResponse.json({ items: [watched(949, 'Heat', '2026-05-01T00:00:00Z')] })
        )
      );

      renderSection('alice', [], { watchlist: { count: 0, isHidden: false } });

      await screen.findByRole('heading', { name: 'Films vus 1' });
      expect(screen.queryByRole('heading', { name: /watchlist/i })).not.toBeInTheDocument();
    });

    it('flags my hidden watchlist and leads to the setting that shows it', async () => {
      server.use(
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          HttpResponse.json({ items: [] })
        ),
        watchlistPage
      );

      renderSection('alice', [], { isOwnProfile: true, watchlist: { count: 12, isHidden: true } });

      expect(await screen.findByRole('heading', { name: 'Ma watchlist 12' })).toBeInTheDocument();
      expect(screen.getByText('Masquée')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Rendre visible' })).toHaveAttribute(
        'href',
        '/settings/profil'
      );
      expect(screen.getByRole('link', { name: /tout voir ma watchlist/i })).toHaveAttribute(
        'href',
        '/watchlist'
      );
    });

    it('turns into a single row with a fan of posters on a phone', async () => {
      stubMatchMedia((query) => query.includes('767px'));
      server.use(
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          HttpResponse.json({ items: [] })
        ),
        watchlistPage
      );

      renderSection('alice', [], { watchlist: { count: 1, isHidden: false } });

      const row = await screen.findByRole('link', { name: /sa watchlist/i });
      expect(row).toHaveAttribute('href', '/u/alice/watchlist');
      expect(row).toHaveTextContent('1 film à voir');
      expect(screen.queryByRole('heading', { name: /sa watchlist/i })).not.toBeInTheDocument();
    });

    it('tells me my watchlist is empty instead of hiding it from me', async () => {
      server.use(
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          HttpResponse.json({ items: [] })
        )
      );

      renderSection('alice', [], { isOwnProfile: true, watchlist: { count: 0, isHidden: false } });

      expect(await screen.findByRole('heading', { name: 'Ma watchlist' })).toBeInTheDocument();
      expect(screen.getByText('Aucun film à voir')).toBeInTheDocument();
      expect(screen.queryByText('Masquée')).not.toBeInTheDocument();
    });
  });
});
