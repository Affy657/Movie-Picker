import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import ProfilePage from '@/features/profile/pages/ProfilePage';
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

function renderProfile(handle: string, client?: QueryClient) {
  return render(
    <AppTestProviders client={client}>
      <MemoryRouter initialEntries={[`/u/${handle}`]}>
        <Routes>
          <Route path="/u/:handle" element={<ProfilePage />} />
          <Route path="/" element={<div data-testid="route-home" />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfilePage (MSW)', () => {
  const server = setupServer(
    http.get(`${TEST_API_V1}/users/:handle/stats`, () => HttpResponse.json(EMPTY_STATS)),
    http.get(`${TEST_API_V1}/users/:handle/watched-movies`, () => HttpResponse.json({ items: [] }))
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
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
      { timeout: 8000 }
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
    expect(link).toHaveAttribute('href', '/settings');
  });

  describe('watchlist', () => {
    it('propose la watchlist d’un autre utilisateur avec son nombre de films', async () => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
        http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE))
      );

      renderProfile('alice');

      const link = await screen.findByRole('link', { name: /sa watchlist/i });
      expect(link).toHaveAttribute('href', '/u/alice/watchlist');
      expect(link).toHaveTextContent(/24 films à voir/i);
    });

    it('accorde le compteur au singulier', async () => {
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
        http.get(`${TEST_API_V1}/users/alice`, () =>
          HttpResponse.json({ ...ALICE_PROFILE, watchlistCount: 1 })
        )
      );

      renderProfile('alice');

      expect(await screen.findByRole('link', { name: /sa watchlist/i })).toHaveTextContent(
        /1 film à voir/i
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

      const link = await screen.findByRole('link', { name: /ma watchlist/i });
      expect(link).toHaveAttribute('href', '/watchlist');
      expect(link).toHaveTextContent(/9 films à voir/i);
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

      const link = await screen.findByRole('link', { name: /ma watchlist/i });
      expect(link).toHaveAttribute('href', '/watchlist');
      expect(link).toHaveTextContent(/masquée/i);
      expect(screen.getByRole('link', { name: /rendre visible/i })).toHaveAttribute(
        'href',
        '/settings/profil'
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

      await screen.findByRole('link', { name: /ma watchlist/i });
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
    expect(screen.getByText(/genres favoris/i)).toBeInTheDocument();
    expect(screen.queryByText(/votes donnés/i)).not.toBeInTheDocument();
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

    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: '3 semaines de suite, Record 5 semaines' })
      ).toBeInTheDocument();
    });
  });

  it("ne montre pas la flamme quand l'utilisateur n'a jamais eu de streak", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () => HttpResponse.json(ALICE_PROFILE)),
      createUserStatsHandler('alice', { currentStreakWeeks: 0, bestStreakWeeks: 0 })
    );

    renderProfile('alice');

    await screen.findByRole('heading', { name: 'Alice' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /statistiques/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('group', { name: /semaine.*de suite/i })).not.toBeInTheDocument();
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
});
