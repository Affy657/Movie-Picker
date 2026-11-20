import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import headerStyles from '@/features/profile/components/ProfileHeader.module.css';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { TEST_API_V1, createUserStatsHandler } from '@/mocks/handlers';
import { queryKeys } from '@/shared/hooks/queryKeys';
import type { QueryClient } from '@tanstack/react-query';

const EMPTY_STATS = {
  eventsCreated: 0,
  eventsJoined: 0,
  moviesProposed: 0,
  votesCast: 0,
  winningProposals: 0,
  moviesSeen: 0,
  favoriteGenres: [],
  dailyActivity: [],
};

const ALICE_PROFILE = {
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
};

const ME_PROFILE = {
  userId: 'u-me',
  displayName: 'Moi',
  emailMasked: 'm***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
  avatarId: '',
  handle: 'moi',
  bio: null,
  isProfilePublic: true,
};

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
    http.get(`${TEST_API_V1}/users/:handle/stats`, () => HttpResponse.json(EMPTY_STATS)),
    http.get(`${TEST_API_V1}/users/:handle/watched-movies`, () => HttpResponse.json({ items: [] })),
    http.get(`${TEST_API_V1}/users/:handle/watchlist`, () =>
      HttpResponse.json({ items: [], total: 0, hasMore: false })
    )
  );

  beforeAll(() => server.listen({ onUnhandledFrame: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche le profil public (pseudo, handle, bio, membre depuis)', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE))
    );

    renderProfile('alice');

    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('Grande cinéphile')).toBeInTheDocument();
    expect(screen.getByText(/membre depuis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^partager$/i })).toBeInTheDocument();
  });

  it('groups the identity of the person in a region named after them', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE))
    );

    renderProfile('alice');

    const heading = await screen.findByRole('heading', { name: 'Alice', level: 1 });
    expect(screen.getByRole('region', { name: 'Alice' })).toContainElement(heading);
  });

  it('offers Share as an icon button that names itself and says it opens a dialog', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE))
    );

    renderProfile('alice');

    const share = await screen.findByRole('button', { name: /^partager$/i });
    expect(share).toHaveAttribute('title', 'Partager');
    expect(share).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('counts the watched movies figure from the total of every viewing', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      createUserStatsHandler('alice', { eventsCreated: 4 }),
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
        HttpResponse.json({
          items: [
            {
              tmdbId: 27205,
              title: 'Inception',
              year: '2010',
              posterPath: null,
              genreIds: [],
              mediaType: 'movie',
              watchedAt: '2026-06-01T00:00:00Z',
            },
          ],
          total: 250,
        })
      )
    );

    renderProfile('alice');

    expect(await screen.findByRole('link', { name: /250\s*films vus/i })).toHaveAttribute(
      'href',
      '/u/alice/films'
    );
  });

  it('counts the public lists as a figure that opens them, in blue like the other links', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      createUserStatsHandler('alice', { eventsCreated: 4, publicListCount: 4 })
    );

    renderProfile('alice');

    expect(await screen.findByRole('link', { name: /4\s*listes créées/i })).toHaveAttribute(
      'href',
      '/u/alice/listes'
    );
  });

  it('names a single public list in the singular', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      createUserStatsHandler('alice', { eventsCreated: 4, publicListCount: 1 })
    );

    renderProfile('alice');

    expect(await screen.findByRole('link', { name: /1\s*liste créée/i })).toBeInTheDocument();
  });

  it('leaves the lists figure out while no list is public', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      createUserStatsHandler('alice', { eventsCreated: 4, publicListCount: 0 })
    );

    renderProfile('alice');

    expect(await screen.findByText(/soirées créées/i)).toBeInTheDocument();
    expect(screen.queryByText(/listes? créées?/i)).toBeNull();
  });

  it('keeps hidden watched films out of the figures and out of the page', async () => {
    let asked = false;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, isWatchedPublic: false })
      ),
      createUserStatsHandler('alice', { eventsCreated: 4 }),
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () => {
        asked = true;
        return HttpResponse.json({ error: 'hidden', reason: 'watched_not_found' }, { status: 404 });
      })
    );

    renderProfile('alice');

    expect(await screen.findByText(/soirées créées/i)).toBeInTheDocument();
    await waitFor(() => expect(asked).toBe(true));
    expect(screen.queryByText(/films vus/i)).toBeNull();
    expect(screen.queryByText('Les films vus n’ont pas pu être chargés.')).toBeNull();
  });

  it('leaves the winning proposals out of the figures when the watched films are hidden', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, isWatchedPublic: false })
      ),
      createUserStatsHandler('alice', { eventsCreated: 4, moviesProposed: 9, winningProposals: 0 })
    );

    renderProfile('alice');

    expect(await screen.findByRole('link', { name: /9\s*films proposés/i })).toBeInTheDocument();
    expect(screen.queryByText(/propositions? gagnantes?/i)).toBeNull();
  });

  it('shows the winning proposals of a member whose watched films are public', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      createUserStatsHandler('alice', { eventsCreated: 4, moviesProposed: 9, winningProposals: 3 })
    );

    renderProfile('alice');

    expect(
      await screen.findByRole('link', { name: /3\s*propositions gagnantes/i })
    ).toHaveAttribute('href', '/u/alice/propositions-gagnantes');
  });

  it('asks for the last watched films without waiting for the profile', async () => {
    let asked = false;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => new Promise<never>(() => undefined)),
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () => {
        asked = true;
        return HttpResponse.json({ items: [], total: 0 });
      })
    );

    renderProfile('alice');

    await waitFor(() => expect(asked).toBe(true));
  });

  it('shows the banner of a member above their profile, credited to its film', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({
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

    expect(await screen.findByTestId('profile-banner-image')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Bannière tirée de Dune : Deuxième partie, voir le film' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifier la bannière' })).not.toBeInTheDocument();
  });

  it('shows nothing in place of a banner to a visitor when the member has none', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE))
    );

    renderProfile('alice');

    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.queryByTestId('profile-banner-image')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter une bannière' })).not.toBeInTheDocument();
  });

  it('offers me to add a banner on my own profile, which opens the choice', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, handle: 'moi', displayName: 'Moi' })
      )
    );

    renderProfile('moi');

    await userEvent.click(await screen.findByRole('button', { name: 'Ajouter une bannière' }));

    expect(await screen.findByRole('dialog', { name: 'Bannière' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Suggestions' })).toBeInTheDocument();
  });

  it('lets me edit the banner of my own profile', async () => {
    const banner = {
      source: 'film',
      imageUrl: 'https://image.tmdb.org/t/p/w1280/sunset.jpg',
      tmdbId: 693134,
      title: 'Dune : Deuxième partie',
    };
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({ ...ME_PROFILE, banner })),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, handle: 'moi', displayName: 'Moi', banner })
      )
    );

    renderProfile('moi');

    await userEvent.click(await screen.findByRole('button', { name: 'Modifier la bannière' }));

    expect(await screen.findByRole('dialog', { name: 'Bannière' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter une bannière' })).not.toBeInTheDocument();
  });

  it('flags on my profile that my watched films are hidden, and leads to the setting', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        HttpResponse.json({
          ...ALICE_PROFILE,
          handle: 'moi',
          displayName: 'Moi',
          isWatchedPublic: false,
        })
      ),
      http.get(`${TEST_API_V1}/users/moi/watched-movies`, () =>
        HttpResponse.json({
          items: [
            {
              tmdbId: 27205,
              title: 'Inception',
              year: '2010',
              posterPath: null,
              genreIds: [],
              mediaType: 'movie',
              watchedAt: '2026-06-01T00:00:00Z',
            },
          ],
          total: 1,
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
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        HttpResponse.json({
          ...ALICE_PROFILE,
          handle: 'moi',
          displayName: 'Moi',
          isWatchedPublic: false,
        })
      ),
      createUserStatsHandler('moi', { eventsCreated: 4 }),
      http.get(`${TEST_API_V1}/users/moi/watched-movies`, () =>
        HttpResponse.json({
          items: [
            {
              tmdbId: 27205,
              title: 'Inception',
              year: '2010',
              posterPath: null,
              genreIds: [],
              mediaType: 'movie',
              watchedAt: '2026-06-01T00:00:00Z',
            },
          ],
          total: 12,
        })
      )
    );

    renderProfile('moi');

    expect(await screen.findByRole('link', { name: /12\s*films vus/i })).toBeInTheDocument();
  });

  it('affiche un squelette pendant le chargement du profil', () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE))
    );

    renderProfile('alice');

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Alice' })).not.toBeInTheDocument();
  });

  it('shows an error with a Retry button when the statistics fail, and recovers', async () => {
    const user = userEvent.setup();
    let statsCallCount = 0;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice/stats`, () => {
        statsCallCount += 1;
        if (statsCallCount === 1) {
          return HttpResponse.json({ error: 'Erreur serveur' }, { status: 500 });
        }
        return HttpResponse.json(EMPTY_STATS);
      })
    );

    renderProfile('alice');
    await screen.findByRole('heading', { name: 'Alice' });

    expect(await screen.findByText(/statistiques n'ont pas pu être chargées/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /réessayer/i });

    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument();
    });
  });

  it('announces the link copy through an aria-live region', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE))
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
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, isSupporter: true })
      )
    );

    renderProfile('alice');

    await screen.findByRole('heading', { name: 'Alice' });
    const badge = screen.getByText('Soutien');
    expect(badge.closest('[aria-describedby]')).toHaveAccessibleDescription(/soutien du projet/i);
  });

  it("n'affiche pas le badge soutien sur un profil sans don", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, isSupporter: false })
      )
    );

    renderProfile('alice');

    await screen.findByRole('heading', { name: 'Alice' });
    expect(screen.queryByText('Soutien')).not.toBeInTheDocument();
  });

  it('affiche les compteurs following/followers cliquables', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE))
    );

    renderProfile('alice');

    expect(await screen.findByRole('button', { name: /3.*abonnements/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /7.*abonnés/i })).toBeInTheDocument();
  });

  it("ouvre la modal following au clic sur le compteur d'abonnements", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice/following`, () => HttpResponse.json({ items: [] }))
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
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice/followers`, () => HttpResponse.json({ items: [] }))
    );

    renderProfile('alice');
    await screen.findByRole('heading', { name: 'Alice' });

    await user.click(screen.getByRole('button', { name: /7.*abonnés/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('offers a Follow link to sign-in for a signed-out visitor', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, isFollowedByMe: null })
      )
    );

    renderProfile('alice');

    const link = await screen.findByRole('link', { name: /suivre/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('/login'));
  });

  it("shows the Follow button when signed in on someone else's profile", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, isFollowedByMe: false })
      )
    );

    renderProfile('alice');

    expect(await screen.findByRole('button', { name: /suivre/i })).toBeInTheDocument();
  });

  it('shows the Unfollow button when already following', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, isFollowedByMe: true })
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
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
        http.get(`${TEST_API_V1}/users/alice`, () =>
          HttpResponse.json({ ...ALICE_PROFILE, isFollowedByMe })
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

  it("n'affiche pas de bouton Suivre sur son propre profil", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        HttpResponse.json({
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
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/moi`, () =>
        HttpResponse.json({
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

  describe('member colour', () => {
    it('shows any visitor the profile in the colour its member picked, avatar ringed', async () => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
        http.get(`${TEST_API_V1}/users/alice`, () =>
          HttpResponse.json({ ...ALICE_PROFILE, accentColor: 'pink' })
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
          HttpResponse.json({ ...ME_PROFILE, accentColor: 'orange' })
        ),
        http.get(`${TEST_API_V1}/users/alice`, () =>
          HttpResponse.json({ ...ALICE_PROFILE, accentColor: 'default' })
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
          HttpResponse.json({ ...ME_PROFILE, accentColor: 'green' })
        ),
        http.get(`${TEST_API_V1}/users/moi`, () =>
          HttpResponse.json({
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
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
        http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE))
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
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
        http.get(`${TEST_API_V1}/users/alice`, () =>
          HttpResponse.json({ ...ALICE_PROFILE, ...overrides })
        )
      );

      renderProfile('alice');

      await screen.findByRole('heading', { name: 'Alice' });
      expect(screen.queryByRole('heading', { name: /watchlist/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /watchlist/i })).not.toBeInTheDocument();
    });

    it('leads to my own watchlist from my profile', async () => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
        http.get(`${TEST_API_V1}/users/moi`, () =>
          HttpResponse.json({
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
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
        http.get(`${TEST_API_V1}/users/moi`, () =>
          HttpResponse.json({
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
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
        http.get(`${TEST_API_V1}/users/moi`, () =>
          HttpResponse.json({
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
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/ghost`, () =>
        HttpResponse.json({ error: 'Profil introuvable' }, { status: 404 })
      )
    );

    renderProfile('ghost');

    await waitFor(() => {
      expect(screen.getByText(/n'existe pas ou n'est pas public/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'ghost' })).not.toBeInTheDocument();
  });

  it.each(['moi', ' Moi'])(
    'takes me to my settings instead of a 404 when my own profile is private (%j)',
    async (urlHandle) => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () =>
          HttpResponse.json({ ...ME_PROFILE, isProfilePublic: false })
        ),
        http.get(`${TEST_API_V1}/users/:handle`, () =>
          HttpResponse.json({ error: 'Profil introuvable' }, { status: 404 })
        )
      );

      renderProfile(encodeURIComponent(urlHandle));

      expect(await screen.findByTestId('route-settings')).toBeInTheDocument();
      expect(screen.queryByText(/n'existe pas ou n'est pas public/i)).not.toBeInTheDocument();
    }
  );

  it("still shows the not found state on someone else's private profile when signed in", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({ error: 'Profil introuvable' }, { status: 404 })
      )
    );

    renderProfile('alice');

    expect(await screen.findByText(/n'existe pas ou n'est pas public/i)).toBeInTheDocument();
    expect(screen.queryByTestId('route-settings')).not.toBeInTheDocument();
  });

  it('masque la bio quand elle est absente', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/bob`, () =>
        HttpResponse.json({
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
    );

    renderProfile('bob');

    expect(await screen.findByRole('heading', { name: 'Bob' })).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
  });

  it('affiche la section statistiques quand les stats sont disponibles', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
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

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/soirées créées/i)).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('votes')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Genres préférés' })).toBeInTheDocument();
    expect(screen.queryByText(/films vus/i)).not.toBeInTheDocument();
  });

  it('affiche la flamme avec le streak courant quand il est > 0', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      createUserStatsHandler('alice', { currentStreakWeeks: 3, bestStreakWeeks: 5 })
    );

    renderProfile('alice');

    await screen.findByRole('heading', { name: 'Alice' });

    const streak = await screen.findByText(/^3 semaines de suite/);
    expect(streak).toHaveTextContent('3 semaines de suite, Record 5 semaines');
  });

  it('ne montre pas la flamme quand la série est éteinte, même avec un record', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
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
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      http.get(`${TEST_API_V1}/users/alice/stats`, () =>
        HttpResponse.json({ error: 'Erreur serveur' }, { status: 500 })
      )
    );

    renderProfile('alice');

    await screen.findByRole('heading', { name: 'Alice' });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /statistiques/i })).not.toBeInTheDocument();
    });
  });

  describe('favorites', () => {
    const HEAT = { tmdbId: 949, mediaType: 'movie', title: 'Heat', year: '1995', posterPath: null };

    it('places the favorites after the statistics, right above the last watched movies', async () => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
        http.get(`${TEST_API_V1}/users/alice`, () =>
          HttpResponse.json({ ...ALICE_PROFILE, favorites: [HEAT] })
        ),
        createUserStatsHandler('alice', { eventsCreated: 4 }),
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          HttpResponse.json({
            items: [
              {
                tmdbId: 27205,
                title: 'Inception',
                year: '2010',
                posterPath: null,
                genreIds: [],
                mediaType: 'movie',
                watchedAt: '2026-06-01T00:00:00Z',
              },
            ],
          })
        )
      );

      renderProfile('alice');

      const stats = await screen.findByRole('heading', { name: /statistiques/i });
      const favorites = await screen.findByRole('heading', { name: 'Ses favoris' });
      const watched = await screen.findByRole('heading', { name: /^films vus/i });
      expect(
        stats.compareDocumentPosition(favorites) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        favorites.compareDocumentPosition(watched) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('opens the film page of a favorite shown beside the watched movies', async () => {
      const user = userEvent.setup();
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
        http.get(`${TEST_API_V1}/users/alice`, () =>
          HttpResponse.json({ ...ALICE_PROFILE, favorites: [HEAT] })
        ),
        http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
          HttpResponse.json({
            items: [
              {
                tmdbId: 27205,
                title: 'Inception',
                year: '2010',
                posterPath: null,
                genreIds: [],
                mediaType: 'movie',
                watchedAt: '2026-06-01T00:00:00Z',
              },
            ],
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
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME_PROFILE)),
        http.get(`${TEST_API_V1}/users/moi`, () =>
          HttpResponse.json({ ...ALICE_PROFILE, handle: 'moi', displayName: 'Moi', favorites: [] })
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
