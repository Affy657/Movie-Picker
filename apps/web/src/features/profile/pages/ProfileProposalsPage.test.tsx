import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { createSavedListsHandlers, TEST_API_V1 } from '@/mocks/handlers';
import type { UserProposedMovieItem } from '@/features/profile/api/profileApi';
import ProfileProposalsPage from './ProfileProposalsPage';

const ALICE_PROFILE = {
  handle: 'alice',
  displayName: 'Alice',
  avatarId: 'alpha',
  bio: null,
  memberSince: '2024-03-15T00:00:00Z',
  followingCount: 3,
  followersCount: 7,
  isSupporter: false,
  isFollowedByMe: null,
};

function proposal(
  tmdbId: number,
  title: string,
  proposalCount: number,
  lastProposedAt: string
): UserProposedMovieItem {
  return {
    tmdbId,
    title,
    year: '2019',
    posterPath: null,
    voteAverage: null,
    runtimeMinutes: null,
    genreIds: [27],
    mediaType: 'movie',
    lastProposedAt,
    proposalCount,
  };
}

const PROPOSED = [
  proposal(530385, 'Midsommar', 7, '2026-11-01T18:00:00Z'),
  proposal(25237, 'Requiem pour un massacre', 1, '2026-11-10T18:00:00Z'),
];

const WINNING = [proposal(25237, 'Requiem pour un massacre', 1, '2026-11-10T18:00:00Z')];

function signedInAs(handle: string) {
  return http.get(`${TEST_API_V1}/auth/me`, () =>
    HttpResponse.json({
      userId: `id-${handle}`,
      displayName: handle,
      emailMasked: 'z***@test.local',
      uiTheme: 'system',
      accentColor: 'default',
      ratingScale: 'ten',
      handle,
    })
  );
}

const signedOut = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({ code: 401, reason: 'unauthorized', error: 'Unauthorized' }, { status: 401 })
);

function renderAt(path: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/u/:handle/propositions" element={<ProfileProposalsPage />} />
          <Route
            path="/u/:handle/propositions-gagnantes"
            element={<ProfileProposalsPage winningOnly />}
          />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfileProposalsPage', () => {
  const requestedWinningOnly: string[] = [];
  const server = setupServer(
    http.get(`${TEST_API_V1}/users/:handle`, () => HttpResponse.json(ALICE_PROFILE)),
    http.get(`${TEST_API_V1}/users/:handle/proposed-movies`, ({ request }) => {
      const winningOnly = new URL(request.url).searchParams.get('winningOnly') ?? '';
      requestedWinningOnly.push(winningOnly);
      const items = winningOnly === 'true' ? WINNING : PROPOSED;
      return HttpResponse.json({ items });
    })
  );

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    requestedWinningOnly.length = 0;
  });
  afterAll(() => server.close());

  it('lists each proposed film once and says how many times it was proposed', async () => {
    renderAt('/u/alice/propositions');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Les films proposés par Alice' })
    ).toBeInTheDocument();
    expect(screen.getByText('2 films, proposés 8 fois')).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Films proposés' });
    expect(within(list).getByText('Midsommar')).toBeInTheDocument();
    expect(within(list).getByText('Requiem pour un massacre')).toBeInTheDocument();
    expect(within(list).getByText('Proposé 7 fois par @alice')).toBeInTheDocument();
    expect(within(list).getAllByText(/fois/)).toHaveLength(2);
    expect(requestedWinningOnly).toEqual(['false']);
  });

  it('shows only the winning proposals on the winners list', async () => {
    renderAt('/u/alice/propositions-gagnantes');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Les propositions gagnantes de Alice',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('1 film gagnant')).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Propositions gagnantes' });
    expect(within(list).getByText('Requiem pour un massacre')).toBeInTheDocument();
    expect(within(list).queryByText('Midsommar')).not.toBeInTheDocument();
    expect(requestedWinningOnly).toEqual(['true']);
  });

  it('says the winning proposals are private when the member hides their watched films', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/:handle`, () =>
        HttpResponse.json({ ...ALICE_PROFILE, isWatchedPublic: false })
      ),
      http.get(`${TEST_API_V1}/users/:handle/proposed-movies`, () =>
        HttpResponse.json(
          { code: 404, reason: 'watched_not_found', error: 'Watched films not found' },
          { status: 404 }
        )
      )
    );

    renderAt('/u/alice/propositions-gagnantes');

    expect(
      await screen.findByText(
        'Ce membre garde ses films vus privés, ses propositions gagnantes le sont donc aussi.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Les propositions gagnantes de Alice' })
    ).toBeInTheDocument();
    expect(screen.queryByText(/introuvable/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Propositions gagnantes' })).not.toBeInTheDocument();
  });

  describe('saving the list in Mes listes', () => {
    it.each([
      { path: '/u/alice/propositions', sourceType: 'memberProposals' },
      { path: '/u/alice/propositions-gagnantes', sourceType: 'memberWinningProposals' },
    ])('saves $path of another member by their handle', async ({ path, sourceType }) => {
      const bodies: unknown[] = [];
      server.use(
        signedInAs('zoe'),
        http.post(`${TEST_API_V1}/saved-lists`, async ({ request }) => {
          bodies.push(await request.clone().json());
        }),
        ...createSavedListsHandlers()
      );
      const user = userEvent.setup();
      renderAt(path);

      await user.click(await screen.findByRole('button', { name: 'Enregistrer dans Mes listes' }));

      expect(await screen.findByRole('button', { name: 'Enregistrée' })).toBeInTheDocument();
      expect(bodies).toEqual([{ sourceType, sourceId: 'alice' }]);
    });

    it('offers nothing to save on my own profile', async () => {
      server.use(signedInAs('alice'), ...createSavedListsHandlers());

      renderAt('/u/alice/propositions');

      expect(await screen.findByRole('list', { name: 'Films proposés' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /enregistr/i })).toBeNull();
      expect(screen.queryByRole('link', { name: /enregistr/i })).toBeNull();
    });

    it('sends a visitor to sign in before saving', async () => {
      server.use(signedOut);

      renderAt('/u/alice/propositions');

      const save = await screen.findByRole('link', { name: 'Enregistrer dans Mes listes' });
      expect(save.getAttribute('href')).toMatch(/^\/login\?returnTo=/);
    });
  });
});
