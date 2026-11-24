import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import FollowListModal from '@/features/profile/components/FollowListModal';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import { TEST_API_V1 } from '@/mocks/handlers';
import { queryKeys } from '@/shared/hooks/queryKeys';
import type { QueryClient } from '@tanstack/react-query';

const SIGNED_IN_ALICE = {
  userId: 'u-alice',
  displayName: 'Alice',
  emailMasked: 'a***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
  avatarId: '',
  handle: 'alice',
  bio: null,
  isProfilePublic: true,
};

const signedInAsAlice = () =>
  http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(SIGNED_IN_ALICE));

const signedOut = () =>
  http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 }));

const person = (handle: string, displayName: string, isFollowedByMe: boolean | null = false) => ({
  handle,
  displayName,
  avatarId: '',
  isFollowedByMe,
});

const listOf = (items: ReturnType<typeof person>[]) => () => HttpResponse.json({ items });

function renderModal(
  overrides: Partial<Parameters<typeof FollowListModal>[0]> = {},
  onClose = vi.fn(),
  client?: QueryClient
) {
  const props = {
    handle: 'alice',
    initialTab: 'followers' as const,
    followingCount: 2,
    followersCount: 5,
    onClose,
    ...overrides,
  };
  return render(
    <AppTestProviders client={client}>
      <MemoryRouter>
        <FollowListModal {...props} />
      </MemoryRouter>
    </AppTestProviders>
  );
}

async function openSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Rechercher des utilisateurs' }));
  return screen.getByRole('searchbox', { name: 'Rechercher des utilisateurs' });
}

describe('FollowListModal (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'warn' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  it('shows the followers tab then the following tab, each with its count', async () => {
    server.use(signedOut(), http.get(`${TEST_API_V1}/users/alice/followers`, listOf([])));

    renderModal();

    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Abonnés5', 'Abonnements2']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('starts on the following tab when asked to', async () => {
    server.use(signedOut(), http.get(`${TEST_API_V1}/users/alice/following`, listOf([])));

    renderModal({ initialTab: 'following' });

    expect(await screen.findByRole('tab', { name: /Abonnements/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(await screen.findByText('Aucun abonnement')).toBeInTheDocument();
  });

  it('says there is no follower yet on an empty followers list', async () => {
    server.use(signedOut(), http.get(`${TEST_API_V1}/users/alice/followers`, listOf([])));

    renderModal();

    expect(await screen.findByText('Aucun abonné')).toBeInTheDocument();
  });

  it('says the list could not load and retries, instead of an empty list', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      signedOut(),
      http.get(`${TEST_API_V1}/users/alice/followers`, () => {
        calls += 1;
        if (calls === 1) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({ items: [person('bob', 'Bob', null)] });
      })
    );

    renderModal({ followersCount: 2 });

    expect(await screen.findByText('Impossible de charger cette liste.')).toBeInTheDocument();
    expect(screen.queryByText('Aucun abonné')).not.toBeInTheDocument();
    expect(screen.queryByText(/profils privés/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Impossible de charger cette liste.')).not.toBeInTheDocument();
  });

  it('lists each person with a handle and a link to the profile that closes the window', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(
      signedOut(),
      http.get(`${TEST_API_V1}/users/alice/followers`, listOf([person('bob', 'Bob', null)]))
    );

    renderModal({ followersCount: 1 }, onClose);

    const link = await screen.findByRole('link', { name: /Bob/ });
    expect(link).toHaveAttribute('href', '/u/bob');
    expect(within(link).getByText('@bob')).toBeInTheDocument();
    await user.click(link);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('explains the gap when the list is shorter than the count', async () => {
    server.use(
      signedOut(),
      http.get(`${TEST_API_V1}/users/alice/following`, listOf([person('bob', 'Bob', null)]))
    );

    renderModal({ initialTab: 'following', followingCount: 2 });

    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(
      screen.getByText('Les profils privés n’apparaissent pas dans cette liste.')
    ).toBeInTheDocument();
  });

  it('says nothing about private profiles when the list matches the count', async () => {
    server.use(
      signedOut(),
      http.get(`${TEST_API_V1}/users/alice/following`, listOf([person('bob', 'Bob', null)]))
    );

    renderModal({ initialTab: 'following', followingCount: 1 });

    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText(/profils privés/i)).not.toBeInTheDocument();
  });

  it('switches to the following list on a tab click', async () => {
    const user = userEvent.setup();
    server.use(
      signedOut(),
      http.get(`${TEST_API_V1}/users/alice/followers`, listOf([])),
      http.get(`${TEST_API_V1}/users/alice/following`, listOf([person('carol', 'Carol', null)]))
    );

    renderModal();
    await screen.findByText('Aucun abonné');

    await user.click(screen.getByRole('tab', { name: /Abonnements/ }));

    expect(await screen.findByText('Carol')).toBeInTheDocument();
  });

  it('calls onClose from the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(signedOut(), http.get(`${TEST_API_V1}/users/alice/followers`, listOf([])));

    renderModal({}, onClose);

    await user.click(await screen.findByRole('button', { name: 'Fermer' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('opens as a native modal and closes on the close event (Escape)', async () => {
    const onClose = vi.fn();
    server.use(signedOut(), http.get(`${TEST_API_V1}/users/alice/followers`, listOf([])));

    renderModal({}, onClose);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('open');

    fireEvent(dialog, new Event('close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    'carries the same name and tabs on a phone and on a large screen (phone: %s)',
    async (isPhone) => {
      stubMatchMedia(isPhone);
      server.use(signedOut(), http.get(`${TEST_API_V1}/users/alice/followers`, listOf([])));

      renderModal();

      const dialog = await screen.findByRole('dialog', { name: 'Abonnés et abonnements' });
      expect(within(dialog).getAllByRole('tab')).toHaveLength(2);
    }
  );

  it('shows a "Vous" badge and no button on the viewer own row', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          ...SIGNED_IN_ALICE,
          userId: 'u-bob',
          displayName: 'Bob',
          handle: 'bob',
        })
      ),
      http.get(`${TEST_API_V1}/users/alice/followers`, listOf([person('bob', 'Bob', null)]))
    );

    renderModal({ followersCount: 1 });

    expect(await screen.findByText('Vous')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suivi?re? @bob/i })).not.toBeInTheDocument();
  });

  it('offers no follow button and no search to a signed-out visitor', async () => {
    server.use(
      signedOut(),
      http.get(`${TEST_API_V1}/users/alice/followers`, listOf([person('bob', 'Bob', null)]))
    );

    renderModal({ followersCount: 1 });

    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suivre/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Rechercher des utilisateurs' })
    ).not.toBeInTheDocument();
  });

  it('follows someone from the list and refreshes every cached profile and list it touched', async () => {
    const user = userEvent.setup();
    const client = createTestQueryClient();
    const touchedKeys = [
      queryKeys.profile.public('lea_m'),
      queryKeys.profile.followers('lea_m'),
      queryKeys.profile.following('bob'),
      queryKeys.event.eligibleFollows('movie-night'),
    ];
    for (const key of touchedKeys) client.setQueryData(key, { items: [] });
    const follows: string[] = [];
    server.use(
      signedInAsAlice(),
      http.get(`${TEST_API_V1}/users/alice/followers`, listOf([person('lea_m', 'Léa Moreau')])),
      http.post(`${TEST_API_V1}/users/:handle/follow`, ({ params }) => {
        follows.push(String(params.handle));
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderModal({ followersCount: 1 }, vi.fn(), client);
    await user.click(await screen.findByRole('button', { name: 'Suivre @lea_m' }));

    await waitFor(() => expect(follows).toEqual(['lea_m']));
    await waitFor(() => {
      for (const key of touchedKeys) {
        expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true);
      }
    });
  });

  it('opens a menu from "Suivi" to stop following someone', async () => {
    const user = userEvent.setup();
    const unfollows: string[] = [];
    server.use(
      signedInAsAlice(),
      http.get(`${TEST_API_V1}/users/alice/following`, listOf([person('bob', 'Bob Durand', true)])),
      http.delete(`${TEST_API_V1}/users/:handle/follow`, ({ params }) => {
        unfollows.push(String(params.handle));
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderModal({ initialTab: 'following', followingCount: 1 });

    const trigger = await screen.findByRole('button', { name: 'Suivi @bob' });
    expect(trigger).toHaveTextContent('Suivi');
    expect(unfollows).toEqual([]);

    await user.click(trigger);
    const menu = screen.getByRole('menu', { name: 'Bob Durand' });
    await user.click(within(menu).getByRole('menuitem', { name: 'Ne plus suivre @bob' }));

    await waitFor(() => expect(unfollows).toEqual(['bob']));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('keeps the other rows usable and the focus on the row while a follow is sent', async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    server.use(
      signedInAsAlice(),
      http.get(
        `${TEST_API_V1}/users/alice/followers`,
        listOf([person('lea_m', 'Léa Moreau'), person('zoe', 'Zoé Lefèvre')])
      ),
      http.post(
        `${TEST_API_V1}/users/:handle/follow`,
        () =>
          new Promise<Response>((resolve) => {
            release = () => resolve(new HttpResponse(null, { status: 204 }));
          })
      )
    );

    renderModal({ followersCount: 2 });
    const lea = await screen.findByRole('button', { name: 'Suivre @lea_m' });
    await user.click(lea);

    await waitFor(() => expect(lea).toHaveAttribute('aria-busy', 'true'));
    expect(lea).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Suivre @zoe' })).toBeEnabled();
    release();
  });

  it('moves the focus to the next row when unfollowing removes the row', async () => {
    const user = userEvent.setup();
    let following = [person('bob', 'Bob Durand', true), person('zoe', 'Zoé Lefèvre', true)];
    server.use(
      signedInAsAlice(),
      http.get(`${TEST_API_V1}/users/alice/following`, () =>
        HttpResponse.json({ items: following })
      ),
      http.delete(`${TEST_API_V1}/users/:handle/follow`, ({ params }) => {
        following = following.filter((item) => item.handle !== params.handle);
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderModal({ initialTab: 'following', followingCount: 2 });
    await user.click(await screen.findByRole('button', { name: 'Suivi @bob' }));
    await user.click(screen.getByRole('menuitem', { name: 'Ne plus suivre @bob' }));

    await waitFor(() => expect(screen.queryByText('Bob Durand')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Suivi @zoe' })).toHaveFocus());
  });

  describe('search in the header', () => {
    it('replaces the title and the tabs with a search field that lists both lists first', async () => {
      const user = userEvent.setup();
      server.use(
        signedInAsAlice(),
        http.get(
          `${TEST_API_V1}/users/alice/followers`,
          listOf([person('zoe', 'Zoé Lefèvre'), person('bob', 'Bob Durand', true)])
        ),
        http.get(
          `${TEST_API_V1}/users/alice/following`,
          listOf([person('bob', 'Bob Durand', true)])
        )
      );

      renderModal();
      const field = await openSearch(user);

      expect(field).toHaveFocus();
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Fermer' })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Abonnés et abonnements' })).toBeInTheDocument();
      expect(screen.getByText('Dans vos listes')).toBeInTheDocument();
      expect(await screen.findByText('Zoé Lefèvre')).toBeInTheDocument();
      expect(screen.getAllByText('Bob Durand')).toHaveLength(1);
    });

    it('names the lists of someone else as theirs', async () => {
      const user = userEvent.setup();
      server.use(
        signedInAsAlice(),
        http.get(`${TEST_API_V1}/users/carla/followers`, listOf([person('zoe', 'Zoé Lefèvre')])),
        http.get(`${TEST_API_V1}/users/carla/following`, listOf([]))
      );

      renderModal({ handle: 'carla' });
      await openSearch(user);

      expect(await screen.findByText('Dans ces listes')).toBeInTheDocument();
    });

    it('filters both lists, then adds the rest of Movie Picker, each match highlighted', async () => {
      const user = userEvent.setup();
      server.use(
        signedInAsAlice(),
        http.get(
          `${TEST_API_V1}/users/alice/followers`,
          listOf([person('carla', 'Carla Rossi'), person('zoe', 'Zoé Lefèvre')])
        ),
        http.get(`${TEST_API_V1}/users/alice/following`, listOf([])),
        http.get(
          `${TEST_API_V1}/users/search`,
          listOf([
            person('carla', 'Carla Rossi'),
            person('camille_m', 'Camille'),
            person('oscar_b', 'Oscar'),
          ])
        )
      );

      renderModal();
      await user.type(await openSearch(user), 'ca');

      expect(await screen.findByText('Sur Movie Picker')).toBeInTheDocument();
      expect(screen.queryByText('Zoé Lefèvre')).not.toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /Carla Rossi/ })).toHaveLength(1);
      const marks = [...document.querySelectorAll('mark')].map((mark) => mark.textContent);
      expect(marks).toEqual(['Ca', 'ca', 'Ca', 'ca', 'ca', 'ca']);
    });

    it('says nobody matches when neither the lists nor Movie Picker do', async () => {
      const user = userEvent.setup();
      server.use(
        signedInAsAlice(),
        http.get(`${TEST_API_V1}/users/alice/followers`, listOf([person('zoe', 'Zoé Lefèvre')])),
        http.get(`${TEST_API_V1}/users/alice/following`, listOf([])),
        http.get(`${TEST_API_V1}/users/search`, listOf([]))
      );

      renderModal();
      await user.type(await openSearch(user), 'xavier');

      expect(await screen.findByText('Personne ne correspond')).toBeInTheDocument();
      expect(screen.queryByText('Dans vos listes')).not.toBeInTheDocument();
    });

    it('waits for two characters before searching all of Movie Picker', async () => {
      const user = userEvent.setup();
      const searchCalls: string[] = [];
      server.use(
        signedInAsAlice(),
        http.get(`${TEST_API_V1}/users/alice/followers`, listOf([person('mona', 'Mona')])),
        http.get(`${TEST_API_V1}/users/alice/following`, listOf([])),
        http.get(`${TEST_API_V1}/users/search`, ({ request }) => {
          searchCalls.push(new URL(request.url).searchParams.get('q') ?? '');
          return HttpResponse.json({ items: [] });
        })
      );

      renderModal();
      await user.type(await openSearch(user), 'm');

      expect(await screen.findByText('Tapez au moins 2 caractères.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Mona/ })).toBeInTheDocument();
      expect(searchCalls).toEqual([]);
    });

    it('says the search failed and retries, instead of claiming nobody matches', async () => {
      const user = userEvent.setup();
      let calls = 0;
      server.use(
        signedInAsAlice(),
        http.get(`${TEST_API_V1}/users/alice/followers`, listOf([])),
        http.get(`${TEST_API_V1}/users/alice/following`, listOf([])),
        http.get(`${TEST_API_V1}/users/search`, () => {
          calls += 1;
          if (calls === 1) return new HttpResponse(null, { status: 500 });
          return HttpResponse.json({ items: [person('sofiamorgane', 'Sofia Benali')] });
        })
      );

      renderModal();
      await user.type(await openSearch(user), 'mor');

      expect(await screen.findByText('Recherche impossible, réessayez.')).toBeInTheDocument();
      expect(screen.queryByText('Personne ne correspond')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Réessayer' }));

      expect(await screen.findByText('Sofia Benali')).toBeInTheDocument();
    });

    it('says the lists could not load and retries, instead of claiming nobody matches', async () => {
      const user = userEvent.setup();
      let followerCalls = 0;
      server.use(
        signedInAsAlice(),
        http.get(`${TEST_API_V1}/users/alice/followers`, () => {
          followerCalls += 1;
          if (followerCalls === 1) return new HttpResponse(null, { status: 500 });
          return HttpResponse.json({ items: [person('carla', 'Carla Rossi')] });
        }),
        http.get(`${TEST_API_V1}/users/alice/following`, listOf([])),
        http.get(`${TEST_API_V1}/users/search`, listOf([]))
      );

      renderModal({ initialTab: 'following' });
      await user.type(await openSearch(user), 'carla');

      expect(await screen.findByText('Impossible de charger cette liste.')).toBeInTheDocument();
      expect(screen.queryByText('Personne ne correspond')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Réessayer' }));

      expect(await screen.findByRole('link', { name: /Carla/ })).toBeInTheDocument();
      expect(screen.queryByText('Impossible de charger cette liste.')).not.toBeInTheDocument();
    });

    it('brings the title and the tabs back on cancel, focus on the search button', async () => {
      const user = userEvent.setup();
      server.use(
        signedInAsAlice(),
        http.get(`${TEST_API_V1}/users/alice/followers`, listOf([])),
        http.get(`${TEST_API_V1}/users/alice/following`, listOf([]))
      );

      renderModal();
      await user.type(await openSearch(user), 'zz');
      await user.click(screen.getByRole('button', { name: 'Annuler' }));

      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Abonnés et abonnements' })).toBeVisible();
      expect(screen.getAllByRole('tab')).toHaveLength(2);
      expect(screen.getByRole('button', { name: 'Rechercher des utilisateurs' })).toHaveFocus();
    });
  });
});
