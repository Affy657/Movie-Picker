import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiErrorJson, apiJson, type ApiSchemas } from '@/mocks/apiJson';
import { buildWatchedMovie } from '@/test-utils/titleItems';
import { buildPublicProfile } from '@/test-utils/publicProfile';
import { buildUserProfile } from '@/test-utils/userProfile';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import headerStyles from '@/features/profile/components/ProfileHeader.module.css';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1, createUserStatsHandler } from '@/mocks/handlers';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import type { QueryClient } from '@tanstack/react-query';

const EMPTY_STATS: ApiSchemas['UserStatsResponse'] = {
  eventsCreated: 0,
  eventsJoined: 0,
  moviesProposed: 0,
  votesCast: 0,
  winningProposals: 0,
  proposalsAverageRating: null,
  moviesSeen: 0,
  publicListCount: 0,
  currentStreakWeeks: 0,
  bestStreakWeeks: 0,
  favoriteGenres: [],
  dailyActivity: [],
};

const ALICE_PROFILE = buildPublicProfile({
  handle: 'alice',
  displayName: 'Alice',
  avatarId: 'alpha',
  bio: 'Grande cinéphile',
  memberSince: '2024-03-15T00:00:00Z',
  followingCount: 3,
  followersCount: 7,
  isFollowedByMe: null,
  isWatchlistPublic: true,
  watchlistCount: 24,
});

const ME_PROFILE = buildUserProfile({
  userId: 'u-me',
  displayName: 'Moi',
  emailMasked: 'm***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
  avatarId: '',
  handle: 'moi',
  bio: null,
  isProfilePublic: true,
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderProfile(handle: string, client?: QueryClient, withLocation = false) {
  return render(
    <AppTestProviders client={client}>
      <MemoryRouter initialEntries={[`/u/${handle}`]}>
        <Routes>
          <Route path="/u/:handle" element={<ProfilePage />} />
          <Route path="/" element={<div data-testid="route-home" />} />
          <Route path="/settings" element={<div data-testid="route-settings" />} />
        </Routes>
        {withLocation ? <LocationProbe /> : null}
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfilePage (MSW)', () => {
  const server = setupServer(
    http.get(`${TEST_API_V1}/users/:handle/stats`, () => apiJson<'UserStatsResponse'>(EMPTY_STATS)),
    http.get(`${TEST_API_V1}/users/:handle/watched-movies`, () =>
      apiJson<'UserWatchedMoviesResponse'>({ items: [], total: null, hasMore: false })
    ),
    http.get(`${TEST_API_V1}/users/:handle/watchlist`, () =>
      apiJson<'WatchlistResponse'>({ items: [], total: 0, hasMore: false })
    )
  );

  beforeAll(() => server.listen({ onUnhandledFrame: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche le profil public (pseudo, handle, bio, membre depuis)', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE))
    );

    renderProfile('alice');

    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('Grande cinéphile')).toBeInTheDocument();
    expect(screen.getByText(/membre depuis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^partager$/i })).toBeInTheDocument();
  });

  it('describes a member without a bio, eliding before a vowel', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, bio: null })
      )
    );

    renderProfile('alice');

    await screen.findByRole('heading', { name: 'Alice' });
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Profil d’Alice (@alice) sur Movie Picker : statistiques de soirées ciné, films proposés et abonnements.'
    );
  });

  it('tells a visitor that a member has nothing to show yet', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, watchlistCount: 0, favorites: [] })
      ),
      createUserStatsHandler('alice')
    );

    renderProfile('alice');

    expect(await screen.findByText('Ce profil est encore vide')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Alice n’a encore rien partagé ici : ni soirée, ni film vu, ni liste publique.'
      )
    ).toBeInTheDocument();
  });

  it('keeps a profile with nothing to show out of search engines, as the server does', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({
          ...ALICE_PROFILE,
          bio: '',
          watchlistCount: 0,
          favorites: [],
        })
      ),
      createUserStatsHandler('alice')
    );

    renderProfile('alice');

    await screen.findByText('Ce profil est encore vide');
    await waitFor(() =>
      expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow'
      )
    );
  });

  it('lets search engines index an otherwise empty profile that has a bio', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, watchlistCount: 0, favorites: [] })
      ),
      createUserStatsHandler('alice')
    );

    renderProfile('alice');

    await screen.findByText('Ce profil est encore vide');
    expect(
      document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? ''
    ).not.toMatch(/noindex/);
  });

  it('leaves the empty state out of a profile with something to show', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      createUserStatsHandler('alice', { eventsJoined: 2 })
    );

    renderProfile('alice');

    expect(await screen.findByRole('heading', { name: 'Statistiques' })).toBeInTheDocument();
    expect(screen.queryByText('Ce profil est encore vide')).not.toBeInTheDocument();
  });

  it('groups the identity of the person in a region named after them', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE))
    );

    renderProfile('alice');

    const heading = await screen.findByRole('heading', { name: 'Alice', level: 1 });
    expect(screen.getByRole('region', { name: 'Alice' })).toContainElement(heading);
  });

  it('offers Share as an icon button that names itself and says it opens a dialog', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE))
    );

    renderProfile('alice');

    const share = await screen.findByRole('button', { name: /^partager$/i });
    expect(share).toHaveAttribute('title', 'Partager');
    expect(share).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('sums up the statistics under the name, each item leading to them', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      createUserStatsHandler('alice', {
        eventsCreated: 4,
        eventsJoined: 2,
        moviesProposed: 9,
        winningProposals: 3,
        currentStreakWeeks: 2,
        bestStreakWeeks: 2,
      })
    );

    renderProfile('alice');

    const identity = await screen.findByRole('region', { name: 'Alice' });
    const nights = await within(identity).findByRole('link', { name: '6 soirées' });
    expect(nights).toHaveAttribute('href', '#profile-stats');
    expect(within(identity).getByRole('link', { name: '3 films gagnants' })).toHaveAttribute(
      'href',
      '#profile-stats'
    );
    expect(within(identity).getByRole('link', { name: /^2 semaines de suite/ })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Statistiques' })).toHaveAttribute(
      'id',
      'profile-stats'
    );
  });

  it('shows the public lists beside the followers, as a link to them', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      createUserStatsHandler('alice', { eventsCreated: 4, publicListCount: 4 })
    );

    renderProfile('alice');

    const identity = await screen.findByRole('region', { name: 'Alice' });
    expect(await within(identity).findByRole('link', { name: '4 listes' })).toHaveAttribute(
      'href',
      '/u/alice/listes'
    );
  });

  it('names a single public list in the singular', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      createUserStatsHandler('alice', { eventsCreated: 4, publicListCount: 1 })
    );

    renderProfile('alice');

    expect(await screen.findByRole('link', { name: '1 liste' })).toBeInTheDocument();
  });

  it('leaves the lists out while no list is public', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      createUserStatsHandler('alice', { eventsCreated: 4, publicListCount: 0 })
    );

    renderProfile('alice');

    expect(await screen.findByRole('link', { name: '4 soirées' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /listes?$/ })).toBeNull();
  });

  it('keeps hidden watched films out of the figures and out of the page', async () => {
    let asked = false;
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, isWatchedPublic: false })
      ),
      createUserStatsHandler('alice', { eventsCreated: 4 }),
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () => {
        asked = true;
        return apiErrorJson(404, 'watched_not_found');
      })
    );

    renderProfile('alice');

    expect(await screen.findByRole('heading', { name: 'Statistiques' })).toBeInTheDocument();
    await waitFor(() => expect(asked).toBe(true));
    expect(screen.queryByText(/films vus/i)).toBeNull();
    expect(screen.queryByText('Les films vus n’ont pas pu être chargés.')).toBeNull();
  });

  it('leaves the winning proposals out of the figures when the watched films are hidden', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, isWatchedPublic: false })
      ),
      createUserStatsHandler('alice', { eventsCreated: 4, moviesProposed: 9, winningProposals: 0 })
    );

    renderProfile('alice');

    expect(await screen.findByRole('link', { name: /9\s*films proposés/i })).toBeInTheDocument();
    expect(screen.queryByText(/films? gagnants?/i)).toBeNull();
  });

  it('shows the winning proposals of a member whose watched films are public', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      createUserStatsHandler('alice', { eventsCreated: 4, moviesProposed: 9, winningProposals: 3 })
    );

    renderProfile('alice');

    const stats = await screen.findByRole('region', { name: 'Statistiques' });
    expect(within(stats).getByRole('link', { name: /3\s*films gagnants/i })).toHaveAttribute(
      'href',
      '/u/alice/propositions-gagnantes'
    );
  });

  it('asks for the last watched films without waiting for the profile', async () => {
    let asked = false;
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => new Promise<never>(() => undefined)),
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () => {
        asked = true;
        return apiJson<'UserWatchedMoviesResponse'>({ items: [], total: 0, hasMore: false });
      })
    );

    renderProfile('alice');

    await waitFor(() => expect(asked).toBe(true));
  });

  it('shows the banner of a member above their profile, credited to its film', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({
          ...ALICE_PROFILE,
          banner: {
            source: 'film',
            imageUrl: 'https://image.tmdb.org/t/p/w1280/sunset.jpg',
            tmdbId: 693134,
            title: 'Dune : Deuxième partie',
          },
        })
      )
    );

    renderProfile('alice');

    expect(await screen.findByTestId('faded-banner-image')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Bannière tirée de Dune : Deuxième partie, voir le film' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifier la bannière' })).not.toBeInTheDocument();
  });

  it('shows nothing in place of a banner to a visitor when the member has none', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE))
    );

    renderProfile('alice');

    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.queryByTestId('faded-banner-image')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter une bannière' })).not.toBeInTheDocument();
  });

  it('offers me to add a banner on my own profile, which opens the choice', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, handle: 'moi', displayName: 'Moi' })
      )
    );

    renderProfile('moi');

    await userEvent.click(await screen.findByRole('button', { name: 'Ajouter une bannière' }));

    expect(await screen.findByRole('dialog', { name: 'Bannière' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Suggestions' })).toBeInTheDocument();
  });

  it('lets me edit the banner of my own profile', async () => {
    const banner: ApiSchemas['ProfileBannerResponse'] = {
      source: 'film',
      imageUrl: 'https://image.tmdb.org/t/p/w1280/sunset.jpg',
      tmdbId: 693134,
      title: 'Dune : Deuxième partie',
    };
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        apiJson<'UserProfileResponse'>({ ...ME_PROFILE, banner })
      ),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        apiJson<'PublicProfileResponse'>({
          ...ALICE_PROFILE,
          handle: 'moi',
          displayName: 'Moi',
          banner,
        })
      )
    );

    renderProfile('moi');

    await userEvent.click(await screen.findByRole('button', { name: 'Modifier la bannière' }));

    expect(await screen.findByRole('dialog', { name: 'Bannière' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter une bannière' })).not.toBeInTheDocument();
  });

  it('flags on my profile that my watched films are hidden, and leads to the setting', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        apiJson<'PublicProfileResponse'>({
          ...ALICE_PROFILE,
          handle: 'moi',
          displayName: 'Moi',
          isWatchedPublic: false,
        })
      ),
      http.get(`${TEST_API_V1}/users/moi/watched-movies`, () =>
        apiJson<'UserWatchedMoviesResponse'>({
          items: [
            buildWatchedMovie({
              tmdbId: 27205,
              title: 'Inception',
              year: '2010',
              posterPath: null,
              genreIds: [],
              mediaType: 'movie',
              watchedAt: '2026-06-01T00:00:00Z',
            }),
          ],
          total: 1,
          hasMore: false,
        })
      )
    );

    renderProfile('moi');

    expect(
      await screen.findByRole('heading', { name: 'Films vus sur Movie Picker 1' })
    ).toBeInTheDocument();
    expect(screen.getByText('Masqués')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rendre visible' })).toHaveAttribute(
      'href',
      '/listes/films-vus'
    );
  });

  it('still shows me my own watched films when I keep them hidden', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        apiJson<'PublicProfileResponse'>({
          ...ALICE_PROFILE,
          handle: 'moi',
          displayName: 'Moi',
          isWatchedPublic: false,
        })
      ),
      createUserStatsHandler('moi', { eventsCreated: 4 }),
      http.get(`${TEST_API_V1}/users/moi/watched-movies`, () =>
        apiJson<'UserWatchedMoviesResponse'>({
          items: [
            buildWatchedMovie({
              tmdbId: 27205,
              title: 'Inception',
              year: '2010',
              posterPath: null,
              genreIds: [],
              mediaType: 'movie',
              watchedAt: '2026-06-01T00:00:00Z',
            }),
          ],
          total: 12,
          hasMore: false,
        })
      )
    );

    renderProfile('moi');

    expect(await screen.findByRole('heading', { name: /^films vus/i })).toBeInTheDocument();
  });

  it('affiche un squelette pendant le chargement du profil', () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE))
    );

    renderProfile('alice');

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Alice' })).not.toBeInTheDocument();
  });

  it('shows the films in the same paint as the profile, so nothing pushes the statistics down', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({
          ...ALICE_PROFILE,
          favorites: [
            { tmdbId: 949, mediaType: 'movie', title: 'Heat', year: '1995', posterPath: null },
          ],
        })
      )
    );

    renderProfile('alice');

    await screen.findByRole('heading', { level: 1, name: 'Alice' });
    expect(screen.getByRole('heading', { name: 'Ses favoris' })).toBeInTheDocument();
  });

  it('waits for the statistics and the last watched films before showing the profile', async () => {
    let answerStats: () => void = () => undefined;
    let answerWatched: () => void = () => undefined;
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice/stats`, async () => {
        await new Promise<void>((resolve) => (answerStats = resolve));
        return apiJson<'UserStatsResponse'>(EMPTY_STATS);
      }),
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, async () => {
        await new Promise<void>((resolve) => (answerWatched = resolve));
        return apiJson<'UserWatchedMoviesResponse'>({ items: [], total: null, hasMore: false });
      })
    );

    renderProfile('alice');

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('heading', { level: 1, name: 'Alice' })).not.toBeInTheDocument();
    answerStats();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('heading', { level: 1, name: 'Alice' })).not.toBeInTheDocument();
    answerWatched();
    expect(await screen.findByRole('heading', { level: 1, name: 'Alice' })).toBeInTheDocument();
  });

  it('does not hold the profile for statistics that never answer', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice/stats`, async () => {
        await new Promise(() => undefined);
        return apiJson<'UserStatsResponse'>(EMPTY_STATS);
      })
    );

    renderProfile('alice');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Alice' }, { timeout: 4000 })
    ).toBeInTheDocument();
  });

  it('shows an error with a Retry button when the statistics fail, and recovers', async () => {
    const user = userEvent.setup();
    let statsCallCount = 0;
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice/stats`, () => {
        statsCallCount += 1;
        if (statsCallCount === 1) {
          return apiErrorJson(500, 'internal_error');
        }
        return apiJson<'UserStatsResponse'>(EMPTY_STATS);
      })
    );

    renderProfile('alice');
    await screen.findByRole('heading', { name: 'Alice' });

    expect(await screen.findByText(/statistiques n’ont pas pu être chargées/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /réessayer/i });

    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument();
    });
  });

  it('announces the link copy through an aria-live region', async () => {
    const user = userEvent.setup();
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE))
    );
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    } as unknown as Navigator);

    try {
      renderProfile('alice');
      await screen.findByRole('heading', { name: 'Alice' });

      await user.click(screen.getByRole('button', { name: /^partager$/i }));
      await user.click(await screen.findByRole('button', { name: /copier le lien/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/lien copié/i);
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('affiche le badge soutien uniquement pour un profil soutien', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, isSupporter: true })
      )
    );

    renderProfile('alice');

    await screen.findByRole('heading', { name: 'Alice' });
    const badge = screen.getByText('Soutien');
    expect(badge.closest('[aria-describedby]')).toHaveAccessibleDescription(/soutien du projet/i);
  });

  it('n’affiche pas le badge soutien sur un profil sans don', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, isSupporter: false })
      )
    );

    renderProfile('alice');

    await screen.findByRole('heading', { name: 'Alice' });
    expect(screen.queryByText('Soutien')).not.toBeInTheDocument();
  });

  it('affiche les compteurs following/followers cliquables', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE))
    );

    renderProfile('alice');

    expect(await screen.findByRole('button', { name: /3.*abonnements/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /7.*abonnés/i })).toBeInTheDocument();
  });

  it('ouvre la modal following au clic sur le compteur d’abonnements', async () => {
    const user = userEvent.setup();
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice/following`, () =>
        apiJson<'FollowListResponse'>({ items: [] })
      )
    );

    renderProfile('alice');
    await screen.findByRole('heading', { name: 'Alice' });

    await user.click(screen.getByRole('button', { name: /3.*abonnements/i }));

    await waitFor(
      () => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      },
      { timeout: 20000 }
    );
  });

  it('opens the followers modal when clicking the followers counter', async () => {
    const user = userEvent.setup();
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice/followers`, () =>
        apiJson<'FollowListResponse'>({ items: [] })
      )
    );

    renderProfile('alice');
    await screen.findByRole('heading', { name: 'Alice' });

    await user.click(screen.getByRole('button', { name: /7.*abonnés/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('asks a signed-out visitor who wants to follow to create an account first', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, isFollowedByMe: null })
      )
    );
    const user = userEvent.setup();

    renderProfile('alice');

    const follow = await screen.findByRole('link', { name: 'Suivre' });
    expect(follow).toHaveAttribute('href', '/register?returnTo=%2Fu%2Falice');
    await user.click(follow);

    const dialog = await screen.findByRole('dialog', { name: 'Suivre Alice' });
    expect(within(dialog).getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/register?returnTo=%2Fu%2Falice'
    );
    expect(within(dialog).getByRole('link', { name: 'J’ai déjà un compte' })).toHaveAttribute(
      'href',
      '/login?returnTo=%2Fu%2Falice'
    );
  });

  it('shows the Follow button when signed in on someone else’s profile', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, isFollowedByMe: false })
      )
    );

    renderProfile('alice');

    expect(await screen.findByRole('button', { name: /suivre/i })).toBeInTheDocument();
  });

  it('shows the Unfollow button when already following', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, isFollowedByMe: true })
      )
    );

    renderProfile('alice');

    expect(await screen.findByRole('button', { name: /ne plus suivre/i })).toBeInTheDocument();
  });

  it.each([
    { action: 'a follow', isFollowedByMe: false, button: 'Suivre @alice', method: 'post' as const },
    {
      action: 'an unfollow',
      isFollowedByMe: true,
      button: 'Ne plus suivre @alice',
      method: 'delete' as const,
    },
  ])(
    'after $action, refreshes my own profile, both follow lists, the user searches and the friends home row',
    async ({ isFollowedByMe, button, method }) => {
      const user = userEvent.setup();
      const client = createTestQueryClient();
      const touchedKeys = [
        queryKeys.profile.public('moi'),
        queryKeys.profile.following('moi'),
        queryKeys.profile.followers('alice'),
        queryKeys.profile.userSearch('ali'),
        queryKeys.event.eligibleFollows('movie-night'),
        queryKeys.me.followingWatchedMovies(20),
      ];
      for (const key of touchedKeys) client.setQueryData(key, { items: [] });
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
        http.get(`${TEST_API_V1}/users/alice`, () =>
          apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, isFollowedByMe })
        ),
        http[method](
          `${TEST_API_V1}/users/alice/follow`,
          () => new HttpResponse(null, { status: 204 })
        )
      );

      renderProfile('alice', client);
      await user.click(await screen.findByRole('button', { name: button }));

      await waitFor(() => {
        for (const key of touchedKeys) {
          expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true);
        }
      });
    }
  );

  it('n’affiche pas de bouton Suivre sur son propre profil', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        apiJson<'PublicProfileResponse'>({
          ...ALICE_PROFILE,
          handle: 'moi',
          displayName: 'Moi',
          isFollowedByMe: null,
        })
      )
    );

    renderProfile('moi');

    await screen.findByRole('heading', { name: 'Moi' });
    expect(screen.queryByRole('button', { name: /suivre/i })).not.toBeInTheDocument();
  });

  it('propose Modifier mon profil sur son propre profil', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        apiJson<'PublicProfileResponse'>({
          ...ALICE_PROFILE,
          handle: 'moi',
          displayName: 'Moi',
          isFollowedByMe: null,
        })
      )
    );

    renderProfile('moi');

    const link = await screen.findByRole('link', { name: /modifier mon profil/i });
    expect(link).toHaveAttribute('href', '/settings/profil');
  });

  it('puts the edit pencil and Share beside my name, the pencil as an icon alone', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, handle: 'moi', displayName: 'Moi' })
      )
    );

    renderProfile('moi');

    const edit = await screen.findByRole('link', { name: 'Modifier mon profil' });
    expect(edit.textContent).toBe('');
    expect(edit).toHaveAttribute('title', 'Modifier mon profil');
    const tools = edit.closest(`.${headerStyles.tools}`);
    expect(tools).toContainElement(screen.getByRole('button', { name: 'Partager' }));
    expect(tools).not.toContainElement(
      screen.getByRole('button', { name: 'Ajouter une bannière' })
    );
  });

  it('keeps Follow under the profile and Share beside the name of someone else', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, isFollowedByMe: false })
      )
    );

    renderProfile('alice');

    const follow = await screen.findByRole('button', { name: /suivre/i });
    const tools = screen
      .getByRole('button', { name: 'Partager' })
      .closest(`.${headerStyles.tools}`);
    expect(tools).not.toBeNull();
    expect(tools).not.toContainElement(follow);
  });

  describe('member colour', () => {
    it('shows any visitor the profile in the colour its member picked, avatar ringed', async () => {
      server.use(
        authMeGuestHandler,
        http.get(`${TEST_API_V1}/users/alice`, () =>
          apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, accentColor: 'pink' })
        )
      );

      const { container } = renderProfile('alice');

      const heading = await screen.findByRole('heading', { name: 'Alice' });
      expect(heading.closest('.accent-pink')).not.toBeNull();
      expect(container.querySelector('img.accent-pink')).toHaveClass(headerStyles.avatarAccent!);
    });

    it('shows a profile without a chosen colour in the app colour, whatever the visitor picked', async () => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () =>
          apiJson<'UserProfileResponse'>({ ...ME_PROFILE, accentColor: 'orange' })
        ),
        http.get(`${TEST_API_V1}/users/alice`, () =>
          apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, accentColor: 'default' })
        )
      );

      const { container } = renderProfile('alice');

      const heading = await screen.findByRole('heading', { name: 'Alice' });
      expect(heading.closest('.accent-default')).not.toBeNull();
      expect(container.querySelector('.accent-orange')).toBeNull();
    });

    it('follows my current colour on my own profile, not the one the profile was fetched with', async () => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () =>
          apiJson<'UserProfileResponse'>({ ...ME_PROFILE, accentColor: 'green' })
        ),
        http.get(`${TEST_API_V1}/users/moi`, () =>
          apiJson<'PublicProfileResponse'>({
            ...ALICE_PROFILE,
            handle: 'moi',
            displayName: 'Moi',
            accentColor: 'pink',
          })
        )
      );

      renderProfile('moi');

      await screen.findByRole('link', { name: /modifier mon profil/i });
      const heading = screen.getByRole('heading', { name: 'Moi' });
      expect(heading.closest('.accent-green')).not.toBeNull();
      expect(heading.closest('.accent-pink')).toBeNull();
    });
  });

  describe('watchlist', () => {
    it('shows a visitor the watchlist of someone else with its count and a way to the full list', async () => {
      server.use(
        authMeGuestHandler,
        http.get(`${TEST_API_V1}/users/alice`, () =>
          apiJson<'PublicProfileResponse'>(ALICE_PROFILE)
        )
      );

      renderProfile('alice');

      expect(await screen.findByRole('heading', { name: 'Sa watchlist 24' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /tout voir sa watchlist/i })).toHaveAttribute(
        'href',
        '/u/alice/watchlist'
      );
    });

    it.each([
      ['masquée', { isWatchlistPublic: false, watchlistCount: null }],
      ['vide', { isWatchlistPublic: true, watchlistCount: 0 }],
    ])('ne montre rien à un visiteur quand la watchlist est %s', async (_label, overrides) => {
      server.use(
        authMeGuestHandler,
        http.get(`${TEST_API_V1}/users/alice`, () =>
          apiJson<'PublicProfileResponse'>(buildPublicProfile({ ...ALICE_PROFILE, ...overrides }))
        )
      );

      renderProfile('alice');

      await screen.findByRole('heading', { name: 'Alice' });
      expect(screen.queryByRole('heading', { name: /watchlist/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /watchlist/i })).not.toBeInTheDocument();
    });

    it('leads to my own watchlist from my profile', async () => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
        http.get(`${TEST_API_V1}/users/moi`, () =>
          apiJson<'PublicProfileResponse'>({
            ...ALICE_PROFILE,
            handle: 'moi',
            displayName: 'Moi',
            isFollowedByMe: null,
            watchlistCount: 9,
          })
        )
      );

      renderProfile('moi');

      expect(await screen.findByRole('heading', { name: 'Ma watchlist 9' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /tout voir ma watchlist/i })).toHaveAttribute(
        'href',
        '/watchlist'
      );
      expect(screen.queryByText(/masquée/i)).not.toBeInTheDocument();
    });

    it('flags on my profile that my watchlist is hidden, even when empty', async () => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
        http.get(`${TEST_API_V1}/users/moi`, () =>
          apiJson<'PublicProfileResponse'>({
            ...ALICE_PROFILE,
            handle: 'moi',
            displayName: 'Moi',
            isFollowedByMe: null,
            isWatchlistPublic: false,
            watchlistCount: 0,
          })
        )
      );

      renderProfile('moi');

      expect(await screen.findByRole('heading', { name: 'Ma watchlist' })).toBeInTheDocument();
      expect(screen.getByText('Masquée')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /rendre visible/i })).toHaveAttribute(
        'href',
        '/watchlist'
      );
    });

    it('does not offer the shortcut to the setting when my watchlist is visible', async () => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
        http.get(`${TEST_API_V1}/users/moi`, () =>
          apiJson<'PublicProfileResponse'>({
            ...ALICE_PROFILE,
            handle: 'moi',
            displayName: 'Moi',
            isFollowedByMe: null,
            isWatchlistPublic: true,
            watchlistCount: 3,
          })
        )
      );

      renderProfile('moi');

      await screen.findByRole('heading', { name: 'Ma watchlist 3' });
      expect(screen.queryByRole('link', { name: /rendre visible/i })).not.toBeInTheDocument();
    });
  });

  it('shows a not found state when the API returns 404', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/ghost`, () => apiErrorJson(404, 'profile_not_found'))
    );

    renderProfile('ghost');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Profil introuvable' })
    ).toBeInTheDocument();
    expect(screen.getByText('Ce profil n’existe pas ou n’est pas public.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/');
    await waitFor(() => expect(document.title).toBe(pageTitle('Profil introuvable')));
    expect(screen.queryByRole('heading', { name: 'ghost' })).not.toBeInTheDocument();
  });

  it.each(['moi', ' Moi'])(
    'takes me to my settings instead of a 404 when my own profile is private (%j)',
    async (urlHandle) => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () =>
          apiJson<'UserProfileResponse'>({ ...ME_PROFILE, isProfilePublic: false })
        ),
        http.get(`${TEST_API_V1}/users/:handle`, () => apiErrorJson(404, 'profile_not_found'))
      );

      renderProfile(encodeURIComponent(urlHandle));

      expect(await screen.findByTestId('route-settings')).toBeInTheDocument();
      expect(screen.queryByText(/n’existe pas ou n’est pas public/i)).not.toBeInTheDocument();
    }
  );

  it('still shows the not found state on someone else’s private profile when signed in', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice`, () => apiErrorJson(404, 'profile_not_found'))
    );

    renderProfile('alice');

    expect(await screen.findByText(/n’existe pas ou n’est pas public/i)).toBeInTheDocument();
    expect(screen.queryByTestId('route-settings')).not.toBeInTheDocument();
  });

  it('masque la bio quand elle est absente', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/bob`, () =>
        apiJson<'PublicProfileResponse'>(
          buildPublicProfile({
            handle: 'bob',
            displayName: 'Bob',
            avatarId: '',
            bio: null,
            memberSince: '2025-01-01T00:00:00Z',
            followingCount: 0,
            followersCount: 0,
            isFollowedByMe: null,
          })
        )
      )
    );

    renderProfile('bob');

    expect(await screen.findByRole('heading', { name: 'Bob' })).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
  });

  it('affiche la section statistiques quand les stats sont disponibles', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      createUserStatsHandler('alice', {
        eventsCreated: 4,
        eventsJoined: 2,
        moviesProposed: 10,
        votesCast: 30,
        winningProposals: 2,
        moviesSeen: 5,
        favoriteGenres: [{ genreId: 878, count: 6 }],
        dailyActivity: [],
      })
    );

    renderProfile('alice');

    await screen.findByRole('heading', { name: 'Alice' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /statistiques/i })).toBeInTheDocument();
    });

    const stats = screen.getByRole('region', { name: 'Statistiques' });
    expect(within(stats).getByText('4 organisées, 2 rejointes')).toBeInTheDocument();
    expect(within(stats).queryByText('30')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Genres préférés' })).toBeInTheDocument();
    expect(screen.queryByText(/films vus/i)).not.toBeInTheDocument();
  });

  it('affiche la flamme avec le streak courant quand il est > 0', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      createUserStatsHandler('alice', { currentStreakWeeks: 3, bestStreakWeeks: 5 })
    );

    renderProfile('alice');

    await screen.findByRole('heading', { name: 'Alice' });

    const streak = await screen.findByText(/^3 semaines de suite/);
    expect(streak).toHaveTextContent('3 semaines de suite, Record 5 semaines');
  });

  it('ne montre pas la flamme quand la série est éteinte, même avec un record', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      createUserStatsHandler('alice', {
        eventsCreated: 1,
        currentStreakWeeks: 0,
        bestStreakWeeks: 4,
      })
    );

    renderProfile('alice');

    await screen.findByRole('heading', { name: 'Alice' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /statistiques/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/de suite/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/aucune série/i)).not.toBeInTheDocument();
  });

  it('hides the stats section when the stats endpoint fails', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/users/alice`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice/stats`, () => apiErrorJson(500, 'internal_error'))
    );

    renderProfile('alice');

    await screen.findByRole('heading', { name: 'Alice' });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /statistiques/i })).not.toBeInTheDocument();
    });
  });

  describe('favorites', () => {
    const HEAT: ApiSchemas['FavoriteTitleResponse'] = {
      tmdbId: 949,
      mediaType: 'movie',
      title: 'Heat',
      year: '1995',
      posterPath: null,
    };

    it('places the favorites first, then the last watched movies, the statistics last', async () => {
      server.use(
        authMeGuestHandler,
        http.get(`${TEST_API_V1}/users/alice`, () =>
          apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, favorites: [HEAT] })
        ),
        createUserStatsHandler('alice', { eventsCreated: 4 }),
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          apiJson<'UserWatchedMoviesResponse'>({
            items: [
              buildWatchedMovie({
                tmdbId: 27205,
                title: 'Inception',
                year: '2010',
                posterPath: null,
                genreIds: [],
                mediaType: 'movie',
                watchedAt: '2026-06-01T00:00:00Z',
              }),
            ],
            total: null,
            hasMore: false,
          })
        )
      );

      renderProfile('alice');

      const stats = await screen.findByRole('heading', { name: /statistiques/i });
      const favorites = await screen.findByRole('heading', { name: 'Ses favoris' });
      const watched = await screen.findByRole('heading', { name: /^films vus/i });
      expect(
        favorites.compareDocumentPosition(watched) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        watched.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('opens the film page of a favorite shown beside the watched movies', async () => {
      const user = userEvent.setup();
      server.use(
        authMeGuestHandler,
        http.get(`${TEST_API_V1}/users/alice`, () =>
          apiJson<'PublicProfileResponse'>({ ...ALICE_PROFILE, favorites: [HEAT] })
        ),
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          apiJson<'UserWatchedMoviesResponse'>({
            items: [
              buildWatchedMovie({
                tmdbId: 27205,
                title: 'Inception',
                year: '2010',
                posterPath: null,
                genreIds: [],
                mediaType: 'movie',
                watchedAt: '2026-06-01T00:00:00Z',
              }),
            ],
            total: null,
            hasMore: false,
          })
        )
      );

      renderProfile('alice', undefined, true);
      await screen.findByRole('heading', { name: /^films vus/i });
      await user.click(screen.getByRole('button', { name: /voir les détails de « heat »/i }));

      expect(screen.getByTestId('location')).toHaveTextContent('/film/949-heat');
    });

    it('invites the owner to pick favorites on their own profile', async () => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(ME_PROFILE)),
        http.get(`${TEST_API_V1}/users/moi`, () =>
          apiJson<'PublicProfileResponse'>({
            ...ALICE_PROFILE,
            handle: 'moi',
            displayName: 'Moi',
            favorites: [],
          })
        )
      );

      renderProfile('moi');

      expect(await screen.findByRole('link', { name: 'Choisir mes favoris' })).toHaveAttribute(
        'href',
        '/settings/profil#favoris'
      );
    });
  });
});
