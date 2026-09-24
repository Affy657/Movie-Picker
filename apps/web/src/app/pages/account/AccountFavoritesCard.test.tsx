import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AccountPage from '@/app/pages/account/AccountPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { setSessionHint } from '@/features/auth/session-hint';
import type { FavoriteTitle } from '@/shared/types/movie';

const HEAT: FavoriteTitle = {
  tmdbId: 949,
  mediaType: 'movie',
  title: 'Heat',
  year: '1995',
  posterPath: null,
};
const TWIN_PEAKS: FavoriteTitle = {
  tmdbId: 1920,
  mediaType: 'tv',
  title: 'Twin Peaks',
  year: '1990',
  posterPath: null,
};
const INCEPTION: FavoriteTitle = {
  tmdbId: 27205,
  mediaType: 'movie',
  title: 'Inception',
  year: '2010',
  posterPath: null,
};

const baseUser = {
  userId: 'u1',
  displayName: 'Alice',
  emailMasked: 'a***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
  avatarId: 'alpha',
  handle: 'alice',
  bio: 'Ma bio',
  isProfilePublic: true,
  isWatchlistPublic: true,
};

function searchItem(favorite: FavoriteTitle) {
  return {
    id: favorite.tmdbId,
    mediaType: favorite.mediaType,
    title: favorite.title,
    year: favorite.year,
    posterPath: favorite.posterPath,
    genreIds: [],
  };
}

function searchReturns(...favorites: FavoriteTitle[]) {
  return http.get(`${TEST_API_V1}/movies/search`, () =>
    HttpResponse.json({ items: favorites.map(searchItem) })
  );
}

function renderSettings(path = '/settings/profil') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/settings/*" element={<AccountPage />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

async function findBlock() {
  return screen.findByRole('region', { name: 'Mes favoris' });
}

async function openSearch(user: ReturnType<typeof userEvent.setup>, query: string) {
  await user.click(await screen.findByRole('button', { name: 'Ajouter un favori' }));
  await user.type(await screen.findByRole('searchbox', { name: 'Rechercher un favori' }), query);
}

describe('AccountFavoritesCard (MSW)', () => {
  const server = setupServer();
  let me: Record<string, unknown>;

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
  });
  afterAll(() => server.close());

  beforeEach(() => {
    setSessionHint();
    me = { ...baseUser, favorites: [HEAT, TWIN_PEAKS] };
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(me)));
  });

  it('lists the favorites with the places left and a way to remove each', async () => {
    renderSettings();

    const block = await findBlock();
    expect(within(block).getByText('2 sur 3')).toBeInTheDocument();
    expect(within(block).getByText('Heat')).toBeInTheDocument();
    expect(within(block).getByText('Twin Peaks')).toBeInTheDocument();
    expect(within(block).getByText('Série')).toBeInTheDocument();
    expect(
      within(block).getByRole('button', { name: 'Retirer Heat de mes favoris' })
    ).toBeInTheDocument();
    expect(within(block).getByText(/affichés sur votre profil public/i)).toBeInTheDocument();
  });

  it('says nobody sees them while the profile is private', async () => {
    me = { ...me, isProfilePublic: false };

    renderSettings();

    expect(
      within(await findBlock()).getByText(/votre profil est privé : vos favoris restent masqués/i)
    ).toBeInTheDocument();
  });

  it('invites to add a first favorite when there is none', async () => {
    me = { ...me, favorites: [] };

    renderSettings();

    const block = await findBlock();
    expect(within(block).getByText('Aucun favori pour l’instant.')).toBeInTheDocument();
    expect(within(block).getByText('0 sur 3')).toBeInTheDocument();
    expect(within(block).getByRole('button', { name: 'Ajouter un favori' })).toBeInTheDocument();
  });

  it('stops offering to add once three favorites are chosen', async () => {
    me = { ...me, favorites: [HEAT, TWIN_PEAKS, INCEPTION] };

    renderSettings();

    const block = await findBlock();
    expect(within(block).getByText(/trois favoris au maximum/i)).toBeInTheDocument();
    expect(
      within(block).queryByRole('button', { name: 'Ajouter un favori' })
    ).not.toBeInTheDocument();
  });

  it('adds a title found through the search and saves it right away', async () => {
    const user = userEvent.setup();
    me = { ...me, favorites: [HEAT] };
    let posted: unknown = null;
    server.use(
      searchReturns(INCEPTION),
      http.post(`${TEST_API_V1}/users/me/favorites`, async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ items: [HEAT, INCEPTION] });
      })
    );

    renderSettings();
    await openSearch(user, 'incep');
    await user.click(await screen.findByRole('button', { name: 'Ajouter « Inception »' }));

    await waitFor(() =>
      expect(posted).toEqual({
        tmdbId: 27205,
        mediaType: 'movie',
        title: 'Inception',
        year: '2010',
        posterPath: null,
      })
    );
    const block = await findBlock();
    expect(await within(block).findByText('2 sur 3')).toBeInTheDocument();
    expect(within(block).getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Enregistré')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Rechercher un favori' })).toBeInTheDocument();
  });

  it('closes the search once the third favorite is added', async () => {
    const user = userEvent.setup();
    server.use(
      searchReturns(INCEPTION),
      http.post(`${TEST_API_V1}/users/me/favorites`, () =>
        HttpResponse.json({ items: [HEAT, TWIN_PEAKS, INCEPTION] })
      )
    );

    renderSettings();
    await openSearch(user, 'incep');
    await user.click(await screen.findByRole('button', { name: 'Ajouter « Inception »' }));

    const block = await findBlock();
    expect(await within(block).findByText('3 sur 3')).toBeInTheDocument();
    expect(
      screen.queryByRole('searchbox', { name: 'Rechercher un favori' })
    ).not.toBeInTheDocument();
    expect(
      within(block).queryByRole('button', { name: 'Ajouter un favori' })
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(within(block).getByRole('heading', { name: 'Mes favoris' })).toHaveFocus()
    );
  });

  it('searches movies and series alike', async () => {
    const user = userEvent.setup();
    let searchedSeries: string | null = null;
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, ({ request }) => {
        searchedSeries = new URL(request.url).searchParams.get('includeSeries');
        return HttpResponse.json({ items: [searchItem(TWIN_PEAKS)] });
      })
    );

    renderSettings();
    await openSearch(user, 'twin');

    await waitFor(() => expect(searchedSeries).toBe('true'));
  });

  it('marks a title that is already a favorite', async () => {
    const user = userEvent.setup();
    server.use(searchReturns(HEAT));

    renderSettings();
    await openSearch(user, 'heat');

    expect(await screen.findByRole('button', { name: 'Déjà en favori' })).toBeDisabled();
  });

  it('keeps a film and a series sharing a number apart', async () => {
    const user = userEvent.setup();
    server.use(searchReturns({ ...TWIN_PEAKS, mediaType: 'movie' }));

    renderSettings();
    await openSearch(user, 'twin');

    expect(await screen.findByRole('button', { name: 'Ajouter « Twin Peaks »' })).toBeEnabled();
  });

  it('removes a favorite at once', async () => {
    const user = userEvent.setup();
    let removedUrl: string | null = null;
    server.use(
      http.delete(`${TEST_API_V1}/users/me/favorites/:tmdbId`, ({ request }) => {
        removedUrl = request.url;
        return HttpResponse.json({ items: [HEAT] });
      })
    );

    renderSettings();
    await user.click(
      within(await findBlock()).getByRole('button', { name: 'Retirer Twin Peaks de mes favoris' })
    );

    await waitFor(() => expect(removedUrl).toMatch(/\/users\/me\/favorites\/1920\?mediaType=tv$/));
    await waitFor(() => expect(screen.queryByText('Twin Peaks')).not.toBeInTheDocument());
    expect(screen.getByText('Enregistré')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Mes favoris' })).toHaveFocus());
  });

  it('keeps the favorite and says so when the removal fails', async () => {
    const user = userEvent.setup();
    server.use(
      http.delete(`${TEST_API_V1}/users/me/favorites/:tmdbId`, () =>
        HttpResponse.json({ error: 'Boom' }, { status: 500 })
      )
    );

    renderSettings();
    const block = await findBlock();
    await user.click(within(block).getByRole('button', { name: 'Retirer Heat de mes favoris' }));

    expect(await within(block).findByRole('alert')).toHaveTextContent(
      'Ce favori n’a pas pu être retiré. Réessayez.'
    );
    expect(within(block).getByText('Heat')).toBeInTheDocument();
  });

  it('keeps the list and shows the error in the search when an addition fails', async () => {
    const user = userEvent.setup();
    server.use(
      searchReturns(INCEPTION),
      http.post(`${TEST_API_V1}/users/me/favorites`, () => HttpResponse.error())
    );

    renderSettings();
    await openSearch(user, 'incep');
    await user.click(await screen.findByRole('button', { name: 'Ajouter « Inception »' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    const block = await findBlock();
    expect(within(block).getByText('2 sur 3')).toBeInTheDocument();
    expect(
      within(block).queryByRole('button', { name: 'Retirer Inception de mes favoris' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Rechercher un favori' })).toBeInTheDocument();
  });

  it('refuses a fourth favorite added from another tab and realigns the list', async () => {
    const user = userEvent.setup();
    server.use(
      searchReturns(INCEPTION),
      http.post(`${TEST_API_V1}/users/me/favorites`, () => {
        me = {
          ...me,
          favorites: [HEAT, TWIN_PEAKS, { ...INCEPTION, tmdbId: 603, title: 'Matrix' }],
        };
        return HttpResponse.json(
          {
            error: 'You already have 3 favorites, remove one to add another',
            reason: 'favorites_limit_reached',
            code: 409,
            params: { max: 3 },
          },
          { status: 409 }
        );
      })
    );

    renderSettings();
    await openSearch(user, 'incep');
    await user.click(await screen.findByRole('button', { name: 'Ajouter « Inception »' }));

    const block = await findBlock();
    expect(await within(block).findByRole('alert')).toHaveTextContent(
      'Vous avez déjà 3 favoris. Retirez-en un pour en ajouter un autre.'
    );
    expect(await within(block).findByText('Matrix')).toBeInTheDocument();
    expect(within(block).getByText('3 sur 3')).toBeInTheDocument();
    expect(
      screen.queryByRole('searchbox', { name: 'Rechercher un favori' })
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(within(block).getByRole('heading', { name: 'Mes favoris' })).toHaveFocus()
    );
  });

  it('scrolls to the block when opened from the profile link', async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

    renderSettings('/settings/profil#favoris');

    const block = await findBlock();
    await waitFor(() => expect(scrollIntoView.mock.contexts).toContain(block));
  });
});
