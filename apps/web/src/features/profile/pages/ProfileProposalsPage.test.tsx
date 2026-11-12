import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
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
});
