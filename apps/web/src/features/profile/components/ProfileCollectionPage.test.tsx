import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { ROUTE_CHUNKS } from '@/app/routeChunks';
import type { MovieListItemLike } from '@/features/movies/hooks/useMovieListToolbar';
import ProfileCollectionPage, {
  type ProfileCollectionTexts,
} from '@/features/profile/components/ProfileCollectionPage';

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

const ITEMS: MovieListItemLike[] = ['Inception', 'Arrival', 'Interstellar'].map((title, i) => ({
  tmdbId: 100 + i,
  title,
  year: String(2010 + i),
  posterPath: null,
  genreIds: [878],
  mediaType: 'movie',
}));

const TEXTS: ProfileCollectionTexts = {
  pageTitle: (name) => `Films de ${name}`,
  seoDescription: () => 'Films',
  subtitle: (count) => `${count} films`,
  listAria: 'Films vus',
  loadError: 'Erreur',
  emptyTitle: 'Rien',
  emptyMessage: 'Rien encore',
  searchLabel: 'Filtrer les films',
  sortPrimaryLabel: 'Date',
};

function renderCollectionAt(entry: { pathname: string; key: string }) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route
            path="/u/:handle/films"
            element={
              <ProfileCollectionPage
                handle="alice"
                queryKey={['profile-collection-test']}
                fetchItems={() => Promise.resolve(ITEMS)}
                comparePrimary={(a, b) => a.tmdbId - b.tmdbId}
                itemKey={(item) => String(item.tmdbId)}
                canonicalPath={(handle) => `/u/${handle}/films`}
                texts={TEXTS}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfileCollectionPage', () => {
  const server = setupServer(
    http.get(`${TEST_API_V1}/users/:handle`, () => HttpResponse.json(ALICE_PROFILE))
  );

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });
  afterAll(() => server.close());

  it('comes back from a film page with the search and the sort left on the list', async () => {
    const user = userEvent.setup();
    const listEntry = { pathname: '/u/alice/films', key: 'collection-entry' };
    const first = renderCollectionAt(listEntry);
    await screen.findByText('Inception');
    await user.click(screen.getByRole('button', { name: /titre/i }));
    await user.type(screen.getByLabelText('Filtrer les films'), 'In');
    first.unmount();

    renderCollectionAt(listEntry);

    expect(await screen.findByLabelText('Filtrer les films')).toHaveValue('In');
    expect(screen.getByRole('button', { name: /titre/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Arrival')).not.toBeInTheDocument();
  });

  it('loads the film page code while the browser is idle', async () => {
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      callback();
      return 1;
    });
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    const loadMoviePage = vi.spyOn(ROUTE_CHUNKS, 'moviePage').mockResolvedValue({} as never);

    renderCollectionAt({ pathname: '/u/alice/films', key: 'collection-entry' });

    expect(await screen.findByText('Inception')).toBeInTheDocument();
    expect(loadMoviePage).toHaveBeenCalled();
  });
});
