import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import {
  authMeGuestHandler,
  createPublicListsHandlers,
  TEST_API_V1,
  type MockListCreator,
  type MockPublicList,
} from '@/mocks/handlers';
import MemberListsPage from './MemberListsPage';

const LEA: MockListCreator = { handle: 'lea', displayName: 'Léa Moreau', avatarId: null };

const signedIn = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
    ratingScale: 'ten',
    handle: 'alice',
  })
);

function film(tmdbId: number, isWatched = false) {
  return {
    tmdbId,
    mediaType: 'movie' as const,
    title: `Film ${tmdbId}`,
    year: '2003',
    posterPath: `/p${tmdbId}.jpg`,
    isWatched,
  };
}

const COREAN: MockPublicList = {
  id: 'l1',
  name: 'Ciné coréen',
  items: [film(1, true), film(2), film(3), film(4)],
  updatedAt: '2026-11-02T00:00:00Z',
};

const HALLOWEEN: MockPublicList = {
  id: 'l2',
  name: 'Halloween',
  items: [film(5), film(6)],
  memberCount: 3,
  updatedAt: '2026-11-05T00:00:00Z',
};

const HITCHCOCK: MockPublicList = {
  id: 'l3',
  name: 'Hitchcock en entier',
  items: [film(7), film(8), film(9)],
  updatedAt: '2026-10-01T00:00:00Z',
};

function profileOf(creator: MockListCreator) {
  return http.get(`${TEST_API_V1}/users/${creator.handle}`, () =>
    HttpResponse.json({
      handle: creator.handle,
      displayName: creator.displayName,
      avatarId: 'alpha',
      bio: null,
      memberSince: '2024-03-15T00:00:00Z',
      followingCount: 0,
      followersCount: 0,
      isSupporter: false,
      isFollowedByMe: null,
      isWatchlistPublic: true,
      watchlistCount: null,
    })
  );
}

function renderPage(handle = 'lea') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[`/u/${handle}/listes`]}>
        <Routes>
          <Route path="/u/:handle/listes" element={<MemberListsPage />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

function withPercentSpace(text: string | null | undefined) {
  return (text ?? '').replaceAll(/\p{Zs}/gu, ' ');
}

async function cardNames() {
  const grid = await screen.findByRole('list', { name: 'Listes publiques' });
  return within(grid)
    .getAllByRole('link')
    .map((link) => link.querySelector('[class*="name"]')?.textContent);
}

describe('MemberListsPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  it('shows the public lists of a member as stacks, under her name and a way back to her profile', async () => {
    server.use(
      signedIn,
      profileOf(LEA),
      ...createPublicListsHandlers(LEA, [COREAN, HALLOWEEN, HITCHCOCK])
    );

    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Les listes de Léa Moreau' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour au profil' })).toHaveAttribute(
      'href',
      '/u/lea'
    );
    expect(await screen.findByText('3 listes créées')).toBeInTheDocument();
    expect(await cardNames()).toEqual(['Halloween', 'Ciné coréen', 'Hitchcock en entier']);
    expect(screen.getByRole('link', { name: /ciné coréen/i })).toHaveAttribute(
      'href',
      '/u/lea/listes/l1'
    );
  });

  it('loads the posters of the first list at once, the others when they come close', async () => {
    server.use(
      signedIn,
      profileOf(LEA),
      ...createPublicListsHandlers(LEA, [COREAN, HALLOWEEN, HITCHCOCK])
    );

    renderPage();

    const grid = await screen.findByRole('list', { name: 'Listes publiques' });
    const [first, ...others] = within(grid).getAllByRole('link');
    const loadings = (card: HTMLElement) =>
      [...card.querySelectorAll('img')].map((img) => img.getAttribute('loading'));
    expect(loadings(first!).length).toBeGreaterThan(0);
    expect(new Set(loadings(first!))).toEqual(new Set(['eager']));
    expect(new Set(others.flatMap(loadings))).toEqual(new Set(['lazy']));
  });

  it('elides the title before a name that starts with a vowel', async () => {
    const alice = { handle: 'alice', displayName: 'Alice Martin', avatarId: null };
    server.use(authMeGuestHandler, profileOf(alice), ...createPublicListsHandlers(alice, [COREAN]));

    renderPage('alice');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Les listes d’Alice Martin' })
    ).toBeInTheDocument();
    expect(await screen.findByText('1 liste créée')).toBeInTheDocument();
  });

  it('shows a signed-in member how much of each list they watched, and which lists are shared', async () => {
    server.use(signedIn, profileOf(LEA), ...createPublicListsHandlers(LEA, [COREAN, HALLOWEEN]));

    renderPage();

    const corean = await screen.findByRole('link', { name: /ciné coréen/i });
    expect(withPercentSpace(corean.textContent)).toContain('4 films');
    expect(withPercentSpace(corean.textContent)).toContain('Vous : 25 % vus');
    const halloween = screen.getByRole('link', { name: /halloween/i });
    expect(halloween).toHaveTextContent('2 films, à plusieurs');
  });

  it('shows a visitor without an account the lists, with no progress', async () => {
    server.use(
      authMeGuestHandler,
      profileOf(LEA),
      ...createPublicListsHandlers(LEA, [COREAN], { viewerSignedIn: false })
    );

    renderPage();

    const corean = await screen.findByRole('link', { name: /ciné coréen/i });
    expect(corean).toHaveTextContent('4 films');
    expect(corean).not.toHaveTextContent(/vous/i);
  });

  it('searches the lists by name and sorts them by name or by number of films', async () => {
    server.use(
      signedIn,
      profileOf(LEA),
      ...createPublicListsHandlers(LEA, [COREAN, HALLOWEEN, HITCHCOCK])
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('3 listes créées');

    const sorts = screen.getByRole('toolbar', { name: /trier par/i });
    expect(
      within(sorts)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['Récentes', 'Nom', 'Nombre de films']);

    await user.click(within(sorts).getByRole('button', { name: 'Nom' }));
    expect(await cardNames()).toEqual(['Ciné coréen', 'Halloween', 'Hitchcock en entier']);

    await user.click(within(sorts).getByRole('button', { name: 'Nombre de films' }));
    expect(await cardNames()).toEqual(['Ciné coréen', 'Hitchcock en entier', 'Halloween']);

    await user.type(screen.getByRole('searchbox', { name: 'Rechercher une liste' }), 'hitch');
    await waitFor(async () => expect(await cardNames()).toEqual(['Hitchcock en entier']));
    expect(screen.getByText('1 sur 3')).toBeInTheDocument();
  });

  it('says so when the member has no public list yet', async () => {
    server.use(signedIn, profileOf(LEA), ...createPublicListsHandlers(LEA, []));

    renderPage();

    expect(await screen.findByText('Aucune liste publique pour le moment')).toBeInTheDocument();
    expect(screen.getByText('0 listes créées')).toBeInTheDocument();
  });

  it('shows the error state of the profile pages when the profile is private', async () => {
    server.use(
      signedIn,
      profileOf(LEA),
      ...createPublicListsHandlers(LEA, [COREAN], { profileFound: false })
    );

    renderPage();

    expect(
      await screen.findByText("Ce profil n'existe pas ou n'est pas public.")
    ).toBeInTheDocument();
  });

  it('shows the same state for an unknown member', async () => {
    server.use(
      signedIn,
      http.get(`${TEST_API_V1}/users/nobody`, () =>
        HttpResponse.json({ reason: 'profile_not_found' }, { status: 404 })
      ),
      http.get(`${TEST_API_V1}/users/nobody/lists`, () =>
        HttpResponse.json({ reason: 'profile_not_found' }, { status: 404 })
      )
    );

    renderPage('nobody');

    expect(
      await screen.findByText("Ce profil n'existe pas ou n'est pas public.")
    ).toBeInTheDocument();
  });
});
