import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import { stubHoverCapability } from '@/test-utils/matchMedia';
import HomePage from '@/app/pages/HomePage';

function showcaseItems(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: 1000 + index,
    mediaType: 'movie',
    title: `${prefix} ${index + 1}`,
    year: '2024',
    posterPath: null,
    voteAverage: 7.5,
    genreIds: [18],
  }));
}

const showcaseHandler = http.get(`${TEST_API_V1}/movies/showcase`, ({ request }) => {
  const section = new URL(request.url).searchParams.get('section') ?? 'trending';
  return HttpResponse.json({
    section,
    theme: new URL(request.url).searchParams.get('theme'),
    items: showcaseItems(section, 3),
    disclaimer: 'TMDB',
    tmdbAttributionUrl: 'https://www.themoviedb.org/',
  });
});

const collectionsHandler = http.get(`${TEST_API_V1}/movies/collections`, () =>
  HttpResponse.json({
    items: [{ id: 10, name: 'Star Wars', overview: null, posterPath: null, movieCount: 9 }],
    disclaimer: 'TMDB',
    tmdbAttributionUrl: 'https://www.themoviedb.org/',
  })
);

const detailsHandler = http.get(`${TEST_API_V1}/movies/tmdb/:tmdbId/details`, () =>
  HttpResponse.json({ tmdbId: 1000, title: 'trending 1', overview: 'Un synopsis.' })
);

const authedUserHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    handle: 'alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
  })
);

const personalHandlers = [
  http.get(`${TEST_API_V1}/watchlist`, () =>
    HttpResponse.json({
      items: [
        {
          tmdbId: 501,
          mediaType: 'movie',
          title: 'Film de ma liste',
          year: '2021',
          posterPath: null,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    })
  ),
  http.get(`${TEST_API_V1}/users/me/following-watched-movies`, () =>
    HttpResponse.json({
      items: [
        {
          tmdbId: 502,
          mediaType: 'movie',
          title: "Film d'un ami",
          year: '2019',
          posterPath: null,
          genreIds: [18],
          watchedAt: '2026-02-01T00:00:00Z',
        },
      ],
    })
  ),
  http.get(`${TEST_API_V1}/users/me/watched-movies`, () =>
    HttpResponse.json({
      items: [
        {
          tmdbId: 27205,
          mediaType: 'movie',
          title: 'Inception',
          year: '2010',
          posterPath: null,
          genreIds: [28],
          watchedAt: '2026-03-01T00:00:00Z',
        },
      ],
    })
  ),
];

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/films/recherche" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('HomePage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  const menuItemNames = () =>
    screen
      .getAllByRole('menuitem')
      .map((item) => item.getAttribute('aria-label') ?? item.textContent?.trim());

  it('ouvre sur un titre de niveau un et son introduction', () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    expect(
      screen.getByRole('heading', { name: /on regarde ce soir/i, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/parcourez les sélections/i)).toBeInTheDocument();
  });

  it('aligns the rows on a single heading level under the h1', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    expect(
      await screen.findByRole('heading', { name: /tendances de la semaine/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /actuellement au cinéma/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /sagas et collections/i, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      await screen.findByRole('heading', { name: 'trending 1', level: 3 })
    ).toBeInTheDocument();
  });

  it('renders the unified card in the rails: the poster opens the details', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler, detailsHandler);
    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: /voir les détails de « trending 1 »/i })
    );

    expect(
      await screen.findByRole('heading', { name: 'trending 1', level: 2 })
    ).toBeInTheDocument();
  });

  it('most-proposed row: rank badge and night count as meta instead of the year', async () => {
    server.use(
      authMeGuestHandler,
      collectionsHandler,
      http.get(`${TEST_API_V1}/movies/showcase`, ({ request }) => {
        const section = new URL(request.url).searchParams.get('section') ?? 'trending';
        const items = showcaseItems(section, 3).map((item, index) =>
          section === 'most-proposed' ? { ...item, rank: index + 1, eventCount: 3 } : item
        );
        return HttpResponse.json({
          section,
          theme: null,
          items,
          disclaimer: '',
          tmdbAttributionUrl: '',
        });
      })
    );
    renderPage();

    const rankLabel = await screen.findByText('Rang 1');
    const card = rankLabel.closest('li');
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText('Dans 3 soirées')).toBeInTheDocument();
    expect(within(card as HTMLElement).queryByText('2024')).not.toBeInTheDocument();
    expect(
      within(card as HTMLElement).getByRole('heading', { name: 'most-proposed 1', level: 3 })
    ).toBeInTheDocument();

    const trendingCard = screen
      .getByRole('heading', { name: 'trending 1', level: 3 })
      .closest('li') as HTMLElement;
    expect(within(trendingCard).getByText('2024')).toBeInTheDocument();
  });

  it('signed-in: the details modal offers the watchlist and the proposal', async () => {
    server.use(
      authedUserHandler,
      showcaseHandler,
      collectionsHandler,
      detailsHandler,
      ...personalHandlers,
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
    );
    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: /voir les détails de « trending 1 »/i })
    );
    await screen.findByRole('heading', { name: 'trending 1', level: 2 });
    expect(screen.getByRole('button', { name: 'Ajouter à ma liste' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Proposer dans une soirée' }));

    expect(
      await screen.findByText(/proposer «\s*trending 1\s*» dans une soirée/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'trending 1', level: 2 })).not.toBeInTheDocument();
    expect(await screen.findByText(/aucune soirée active/i)).toBeInTheDocument();
  });

  it('visitor: no library footer in the details modal', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler, detailsHandler);
    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: /voir les détails de « trending 1 »/i })
    );
    await screen.findByRole('heading', { name: 'trending 1', level: 2 });

    expect(screen.queryByRole('button', { name: 'Ajouter à ma liste' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Proposer dans une soirée' })
    ).not.toBeInTheDocument();
  });

  it('hover, signed-in: the showcase card carries the library kebab', async () => {
    stubHoverCapability();
    server.use(
      authedUserHandler,
      showcaseHandler,
      collectionsHandler,
      ...personalHandlers,
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: /plus d’actions pour «\s*trending 1\s*»/i })
    );

    expect(menuItemNames()).toEqual([
      'Voir les détails',
      'Ajouter à ma liste',
      'Proposer dans une soirée',
      'Ouvrir sur Letterboxd',
    ]);

    await user.click(screen.getByRole('menuitem', { name: 'Proposer dans une soirée' }));

    expect(
      await screen.findByText(/proposer «\s*trending 1\s*» dans une soirée/i)
    ).toBeInTheDocument();
  });

  it('hover, signed-in: the watchlist rail card offers to remove the movie from the list', async () => {
    stubHoverCapability();
    let removedPath: string | null = null;
    server.use(
      authedUserHandler,
      showcaseHandler,
      collectionsHandler,
      ...personalHandlers,
      http.delete(`${TEST_API_V1}/watchlist/:tmdbId`, ({ request }) => {
        removedPath = new URL(request.url).pathname;
        return new HttpResponse(null, { status: 204 });
      })
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', {
        name: /plus d’actions pour «\s*film de ma liste\s*»/i,
      })
    );

    expect(menuItemNames()).toEqual([
      'Voir les détails',
      'Retirer de ma liste',
      'Proposer dans une soirée',
      'Ouvrir sur Letterboxd',
    ]);

    await user.click(screen.getByRole('menuitem', { name: 'Retirer de ma liste' }));

    await waitFor(() => expect(removedPath).toContain('/watchlist/501'));
  });

  it('hover, visitor: the kebab keeps only the details and Letterboxd', async () => {
    stubHoverCapability();
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: /plus d’actions pour «\s*trending 1\s*»/i })
    );

    expect(menuItemNames()).toEqual(['Voir les détails', 'Ouvrir sur Letterboxd']);
  });

  it('without hover capability: no kebab on the rails', async () => {
    server.use(authedUserHandler, showcaseHandler, collectionsHandler, ...personalHandlers);
    renderPage();

    await screen.findByRole('heading', { name: /dans votre liste/i, level: 2 });
    await screen.findByRole('heading', { name: 'trending 1', level: 3 });
    expect(screen.queryByRole('button', { name: /plus d’actions/i })).not.toBeInTheDocument();
  });

  it('hides an empty row instead of leaving an orphan heading', async () => {
    server.use(
      authMeGuestHandler,
      collectionsHandler,
      http.get(`${TEST_API_V1}/movies/showcase`, ({ request }) => {
        const section = new URL(request.url).searchParams.get('section') ?? 'trending';
        return HttpResponse.json({
          section,
          theme: null,
          items: section === 'most-proposed' ? [] : showcaseItems(section, 3),
          disclaimer: '',
          tmdbAttributionUrl: '',
        });
      })
    );
    renderPage();

    await screen.findByRole('heading', { name: /tendances de la semaine/i, level: 2 });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /les plus proposés/i })).not.toBeInTheDocument();
    });
  });

  it('affiche les pastilles de genre en onglets', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    const tablist = await screen.findByRole('tablist', { name: /genre/i });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs[0]).toHaveAccessibleName(/tous/i);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('leads the search to the results page', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    await userEvent.type(screen.getByLabelText(/chercher un film/i), 'dune{enter}');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/films/recherche?q=dune');
    });
  });

  it('starts a search from a suggested example', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Dune' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/films/recherche?q=Dune');
    });
  });

  it('exposes the streaming row with its platforms', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    expect(
      await screen.findByRole('heading', { name: /ce soir en streaming/i, level: 2 })
    ).toBeInTheDocument();
    const tablist = screen.getByRole('tablist', { name: /plateforme/i });
    expect(within(tablist).getByRole('tab', { name: 'Netflix' })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: 'Disney+' })).toBeInTheDocument();
  });

  it('shows no personal row to a visitor', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    await screen.findByRole('heading', { name: /tendances de la semaine/i, level: 2 });
    expect(screen.queryByRole('heading', { name: /dans votre liste/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /vos amis ont vu/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /parce que vous avez aimé/i })
    ).not.toBeInTheDocument();
  });

  it('adds the personal rows for a signed-in user', async () => {
    server.use(authedUserHandler, showcaseHandler, collectionsHandler, ...personalHandlers);
    renderPage();

    expect(
      await screen.findByRole('heading', { name: /dans votre liste/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /vos amis ont vu/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /parce que vous avez aimé/i, level: 2 })
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /prochaine soirée/i })).not.toBeInTheDocument();
  });

  it('eager-loads the first posters of the first rendered rail only', async () => {
    const posterShowcaseHandler = http.get(`${TEST_API_V1}/movies/showcase`, ({ request }) => {
      const section = new URL(request.url).searchParams.get('section') ?? 'trending';
      return HttpResponse.json({
        section,
        theme: null,
        items: showcaseItems(section, 4).map((item) => ({ ...item, posterPath: '/p.jpg' })),
        disclaimer: 'TMDB',
        tmdbAttributionUrl: 'https://www.themoviedb.org/',
      });
    });
    let releaseWatchlist: () => void = () => undefined;
    const watchlistGate = new Promise<void>((resolve) => {
      releaseWatchlist = resolve;
    });
    const posterWatchlistHandler = http.get(`${TEST_API_V1}/watchlist`, async () => {
      await watchlistGate;
      return HttpResponse.json({
        items: [
          {
            tmdbId: 501,
            mediaType: 'movie',
            title: 'Film de ma liste',
            year: '2021',
            posterPath: '/w.jpg',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
      });
    });
    const railImages = (heading: RegExp) => {
      const section = screen.getByRole('heading', { name: heading, level: 2 }).closest('section');
      return Array.from(section?.querySelectorAll('img') ?? []);
    };
    const railLoading = (heading: RegExp) =>
      railImages(heading).map((img) => img.getAttribute('loading'));

    server.use(
      authedUserHandler,
      posterWatchlistHandler,
      posterShowcaseHandler,
      collectionsHandler,
      ...personalHandlers
    );
    const { unmount } = renderPage();

    await waitFor(() => expect(railImages(/ce soir en streaming/i)).toHaveLength(4));
    expect(screen.queryByRole('heading', { name: /dans votre liste/i })).not.toBeInTheDocument();
    expect(railLoading(/ce soir en streaming/i)).toEqual(['lazy', 'lazy', 'lazy', 'lazy']);

    releaseWatchlist();
    await screen.findByRole('heading', { name: /dans votre liste/i, level: 2 });
    expect(railLoading(/dans votre liste/i)).toEqual(['eager']);
    expect(railLoading(/ce soir en streaming/i)).toEqual(['lazy', 'lazy', 'lazy', 'lazy']);
    unmount();

    server.use(authMeGuestHandler, posterShowcaseHandler, collectionsHandler);
    renderPage();

    await waitFor(() => expect(railImages(/ce soir en streaming/i)).toHaveLength(4));
    expect(railLoading(/ce soir en streaming/i)).toEqual(['eager', 'eager', 'eager', 'lazy']);
  });

  it('leads to movie night creation from the bottom band', () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    expect(screen.getByRole('link', { name: /créer une soirée/i })).toHaveAttribute('href', '/new');
  });

  it('declares a canonical on the root', () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://web.movie-picker.fr/'
    );
  });

  it('signale une section en panne sans casser la page', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/movies/showcase`, () => HttpResponse.json({}, { status: 503 })),
      collectionsHandler
    );
    renderPage();

    expect((await screen.findAllByText(/momentanément indisponible/i)).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', { name: /on regarde ce soir/i, level: 1 })
    ).toBeInTheDocument();
  });

  it('keeps a valid tab panel even when the section fails', async () => {
    server.use(
      authMeGuestHandler,
      collectionsHandler,
      http.get(`${TEST_API_V1}/movies/showcase`, () => new HttpResponse(null, { status: 503 }))
    );
    renderPage();

    const tabs = await screen.findAllByRole('tab', { selected: true });
    expect(tabs.length).toBeGreaterThan(0);
    for (const tab of tabs) {
      const panelId = tab.getAttribute('aria-controls');
      expect(panelId).toBeTruthy();
      expect(document.getElementById(panelId as string)).not.toBeNull();
    }
  });
});
