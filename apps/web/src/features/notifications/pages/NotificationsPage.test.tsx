import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { apiJson, type ApiSchemas } from '@/mocks/apiJson';
import { ROUTES } from '@/app/routes';

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    </AppTestProviders>
  );
}

const base = { actorAvatarId: '', isRead: false, createdAt: '2026-06-03T10:00:00Z' };

const LIST_INVITATION = {
  ...base,
  id: 'li',
  type: 'listinvitation',
  actorHandle: 'lea',
  actorDisplayName: 'Léa',
  listId: 'l9',
  listName: 'Ciné du dimanche',
  listInvitationPending: true,
};

const GROUP_INVITATION = {
  ...base,
  id: 'gi',
  type: 'groupinvitation',
  actorHandle: 'lea',
  actorDisplayName: 'Léa',
  groupId: 'g9',
  groupName: 'Les jeudis ciné',
  groupInvitationPending: true,
};

const GROUP_NIGHT = {
  ...base,
  id: 'gn',
  type: 'groupnight',
  actorHandle: 'sam',
  actorDisplayName: 'Sam',
  eventSlug: 'halloween',
  eventTitle: 'Halloween en retard',
  groupId: 'g9',
  groupName: 'Les jeudis ciné',
};

function inboxItem(
  item: Partial<ApiSchemas['UserNotificationItem']> &
    Pick<ApiSchemas['UserNotificationItem'], 'id' | 'type'>
): ApiSchemas['UserNotificationItem'] {
  return {
    actorHandle: null,
    actorDisplayName: null,
    actorAvatarId: null,
    eventSlug: null,
    eventTitle: null,
    movieTitle: null,
    listId: null,
    listName: null,
    listInvitationPending: false,
    groupId: null,
    groupName: null,
    groupInvitationPending: false,
    isRead: false,
    createdAt: '2026-06-03T10:00:00Z',
    ...item,
  };
}

function serveTypedInbox(items: ApiSchemas['UserNotificationItem'][]) {
  return http.get(`${TEST_API_V1}/notifications/inbox`, () =>
    apiJson<'NotificationInboxResponse'>({ items, unreadCount: items.length, hasMore: false })
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderInbox() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/notifications']}>
        <Routes>
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/listes/:listId" element={<p>Page de la liste</p>} />
          <Route path="/groupes/:groupId" element={<p>Page du groupe</p>} />
          <Route path="/e/:slug" element={<p>Page de la soirée</p>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AppTestProviders>
  );
}

function serveInbox(items: Record<string, unknown>[]) {
  return http.get(`${TEST_API_V1}/notifications/inbox`, () =>
    HttpResponse.json({ items, unreadCount: items.length, hasMore: false })
  );
}

const ignoreRead = http.post(
  `${TEST_API_V1}/notifications/inbox/:id/read`,
  () => new HttpResponse(null, { status: 204 })
);

const authedUserHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
  })
);

describe('NotificationsPage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('says the inbox could not load and retries, instead of claiming it is empty', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, () => {
        calls += 1;
        if (calls === 1) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({
          items: [{ ...base, id: 'a', type: 'eventdeleted', eventTitle: 'Soiree Rechargee' }],
          unreadCount: 1,
          hasMore: false,
        });
      })
    );

    renderPage();

    expect(await screen.findByText('Impossible de charger vos notifications.')).toBeInTheDocument();
    expect(screen.queryByText(/aucune notification/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText(/Soiree Rechargee/)).toBeInTheDocument();
    expect(screen.queryByText('Impossible de charger vos notifications.')).not.toBeInTheDocument();
  });

  it('shows the empty state when there is no notification', async () => {
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({ items: [], unreadCount: 0 })
      )
    );

    renderPage();

    expect(await screen.findByText(/aucune notification/i)).toBeInTheDocument();
  });

  it('groups two notifications of the same movie night under a single header', async () => {
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({
          items: [
            {
              ...base,
              id: 'a',
              type: 'movieadded',
              eventSlug: 's1',
              eventTitle: 'Soiree Groupee',
              movieTitle: 'Matrix',
            },
            {
              ...base,
              id: 'b',
              type: 'participantjoined',
              eventSlug: 's1',
              eventTitle: 'Soiree Groupee',
              actorDisplayName: 'Bob',
            },
          ],
          unreadCount: 2,
        })
      )
    );

    renderPage();

    const headers = await screen.findAllByText('Soiree Groupee', { selector: 'p > bdi' });
    expect(headers).toHaveLength(1);
  });

  it('uses the singular on the expand button when a single notification is hidden', async () => {
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({
          items: ['Matrix', 'Heat', 'Alien', 'Dune'].map((movieTitle, index) => ({
            ...base,
            id: `n${index}`,
            type: 'movieadded',
            eventSlug: 's1',
            eventTitle: 'Soiree Groupee',
            movieTitle,
          })),
          unreadCount: 4,
        })
      )
    );

    renderPage();

    expect(await screen.findByRole('button', { name: 'Voir l’autre' })).toBeInTheDocument();
  });

  it('un lien follower pointe vers le profil, et le clic marque la notif comme lue', async () => {
    const user = userEvent.setup();
    let markedId: string | null = null;
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({
          items: [
            {
              ...base,
              id: 'n1',
              type: 'newfollower',
              actorHandle: 'bob',
              actorDisplayName: 'Bob',
            },
          ],
          unreadCount: 1,
        })
      ),
      http.post(`${TEST_API_V1}/notifications/inbox/:id/read`, ({ params }) => {
        markedId = params.id as string;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderPage();

    const link = await screen.findByRole('link', { name: /bob/i });
    expect(link).toHaveAttribute('href', ROUTES.profile('bob'));

    await user.click(link);
    await waitFor(() => expect(markedId).toBe('n1'));
  });

  it('a rating reminder names the movie and opens the movie night in rating mode', async () => {
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({
          items: [
            {
              ...base,
              id: 'r1',
              type: 'ratingreminder',
              eventSlug: 'soiree-pizza',
              eventTitle: 'Soiree pizza',
              movieTitle: 'Inception',
            },
          ],
          unreadCount: 1,
        })
      )
    );

    renderPage();

    const link = await screen.findByRole('link', { name: /Inception/ });
    expect(link).toHaveTextContent('Soiree pizza');
    expect(link).toHaveAttribute('href', ROUTES.eventDetailRating('soiree-pizza'));
  });

  it('a Letterboxd films-to-confirm notification leads to the integrations settings', async () => {
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({
          items: [{ ...base, id: 'lb', type: 'letterboxdreconciliationpending' }],
          unreadCount: 1,
        })
      )
    );

    renderPage();

    expect(await screen.findByRole('link', { name: /synchro letterboxd/i })).toHaveAttribute(
      'href',
      ROUTES.accountIntegrations
    );
  });

  it("a 'movie night cancelled' notification is not clickable to a destination", async () => {
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({
          items: [{ ...base, id: 'd', type: 'eventdeleted', eventTitle: 'Soiree Annulee' }],
          unreadCount: 1,
        })
      )
    );

    renderPage();

    await screen.findByText(/Soiree Annulee/);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Soiree Annulee/ })).toBeInTheDocument();
  });

  describe('names written by other people', () => {
    it('isolates a name that carries a right-to-left override, so it cannot turn the sentence around', async () => {
      const reversed = '\u202Eecila';
      server.use(
        authedUserHandler,
        serveTypedInbox([
          inboxItem({
            id: 'rlo',
            type: 'participantjoined',
            actorHandle: 'alice',
            actorDisplayName: reversed,
            eventSlug: 'nolan',
            eventTitle: 'Nuit Nolan',
          }),
        ])
      );
      renderInbox();

      const text = await screen.findByText(
        (_, element) => element?.tagName === 'P' && !!element.textContent?.includes('Nuit Nolan')
      );
      const isolated = Array.from(text.querySelectorAll('bdi')).map((node) => node.textContent);
      expect(isolated).toEqual([reversed, 'Nuit Nolan']);
    });

    it('keeps the bold of the template when a title holds two asterisks', async () => {
      server.use(
        authedUserHandler,
        serveTypedInbox([
          inboxItem({ id: 'stars', type: 'eventdeleted', eventTitle: 'Soirée **gras**' }),
        ])
      );
      renderInbox();

      const title = await screen.findByText('Soirée **gras**');
      expect(title.tagName).toBe('BDI');
      expect(title.closest('strong')).not.toBeNull();
    });
  });

  describe('a kind of notification this version does not know yet', () => {
    it('still says something rather than leaving the row blank', async () => {
      server.use(
        authedUserHandler,
        ignoreRead,
        serveTypedInbox([
          inboxItem({
            id: 'later',
            type: 'kindfromalaterversion' as ApiSchemas['UserNotificationItem']['type'],
          }),
        ])
      );
      renderInbox();

      expect(await screen.findByText('Nouvelle activité sur Movie Picker.')).toBeInTheDocument();
    });
  });

  describe('host role handed over', () => {
    it('tells the new host which night is now theirs and opens it', async () => {
      const user = userEvent.setup();
      server.use(
        authedUserHandler,
        ignoreRead,
        serveTypedInbox([
          inboxItem({
            id: 'heir',
            type: 'hostrolereceived',
            eventSlug: 'halloween',
            eventTitle: 'Halloween en retard',
          }),
        ])
      );
      renderInbox();

      const text = await screen.findByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent ===
            'L’hôte de Halloween en retard a supprimé son compte : vous organisez désormais la soirée.'
      );
      await user.click(text);

      expect(await screen.findByText('Page de la soirée')).toBeInTheDocument();
    });
  });

  describe('invitation to a list', () => {
    it('says who invites to which list, with Accepter and Refuser while it waits', async () => {
      server.use(authedUserHandler, serveInbox([LIST_INVITATION]));
      renderInbox();

      expect(
        await screen.findByText(
          (_, element) =>
            element?.tagName === 'P' &&
            element.textContent === 'Léa vous invite à rejoindre la liste « Ciné du dimanche »'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Accepter l’invitation à « Ciné du dimanche »' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Refuser l’invitation à « Ciné du dimanche »' })
      ).toBeInTheDocument();
    });

    it('accepts, marks it read and opens the list', async () => {
      let accepted = false;
      let markedId: string | null = null;
      server.use(
        authedUserHandler,
        serveInbox([LIST_INVITATION]),
        http.post(`${TEST_API_V1}/lists/l9/invitation/accept`, () => {
          accepted = true;
          return HttpResponse.json({ id: 'l9', name: 'Ciné du dimanche' });
        }),
        http.post(`${TEST_API_V1}/notifications/inbox/:id/read`, ({ params }) => {
          markedId = params.id as string;
          return new HttpResponse(null, { status: 204 });
        })
      );
      const user = userEvent.setup();
      renderInbox();

      await user.click(
        await screen.findByRole('button', { name: 'Accepter l’invitation à « Ciné du dimanche »' })
      );

      expect(await screen.findByText('Page de la liste')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/listes/l9');
      expect(accepted).toBe(true);
      expect(markedId).toBe('li');
    });

    it('declines and takes the answers away', async () => {
      let declined = false;
      server.use(
        authedUserHandler,
        serveInbox([LIST_INVITATION]),
        ignoreRead,
        http.post(`${TEST_API_V1}/lists/l9/invitation/decline`, () => {
          declined = true;
          return new HttpResponse(null, { status: 204 });
        })
      );
      const user = userEvent.setup();
      renderInbox();

      await user.click(
        await screen.findByRole('button', { name: 'Refuser l’invitation à « Ciné du dimanche »' })
      );

      await waitFor(() =>
        expect(screen.queryByRole('button', { name: /accepter l’invitation/i })).toBeNull()
      );
      expect(declined).toBe(true);
      expect(screen.getByTestId('location')).toHaveTextContent('/notifications');
    });

    it('says why an answer failed', async () => {
      server.use(
        authedUserHandler,
        serveInbox([LIST_INVITATION]),
        http.post(`${TEST_API_V1}/lists/l9/invitation/accept`, () =>
          HttpResponse.json(
            {
              error: 'list_invitation_not_found',
              code: 404,
              reason: 'list_invitation_not_found',
            },
            { status: 404 }
          )
        )
      );
      const user = userEvent.setup();
      renderInbox();

      await user.click(
        await screen.findByRole('button', { name: 'Accepter l’invitation à « Ciné du dimanche »' })
      );

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Cette invitation n’est plus valable.'
      );
    });

    it('leads to Mes listes once answered, without the answers', async () => {
      server.use(
        authedUserHandler,
        serveInbox([{ ...LIST_INVITATION, listInvitationPending: false, isRead: true }])
      );
      renderInbox();

      const link = await screen.findByRole('link', { name: /ciné du dimanche/i });
      expect(link).toHaveAttribute('href', ROUTES.lists);
      expect(screen.queryByRole('button', { name: /accepter/i })).toBeNull();
    });
  });

  it("le bouton 'tout marquer comme lu' appelle l'API read-all", async () => {
    const user = userEvent.setup();
    let readAll = 0;
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({
          items: [{ ...base, id: 'a', type: 'eventdeleted', eventTitle: 'Soiree' }],
          unreadCount: 1,
        })
      ),
      http.post(`${TEST_API_V1}/notifications/inbox/read-all`, () => {
        readAll += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderPage();

    const btn = await screen.findByRole('button', { name: /tout marquer comme lu/i });
    await user.click(btn);

    await waitFor(() => expect(readAll).toBe(1));
  });

  it("affiche 'charger la suite' quand hasMore est vrai, et charge la page suivante au clic", async () => {
    const user = userEvent.setup();
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, ({ request }) => {
        const offset = new URL(request.url).searchParams.get('offset');
        if (offset === '1') {
          return HttpResponse.json({
            items: [{ ...base, id: 'page2', type: 'eventdeleted', eventTitle: 'Soiree Page 2' }],
            unreadCount: 2,
            hasMore: false,
          });
        }
        return HttpResponse.json({
          items: [{ ...base, id: 'page1', type: 'eventdeleted', eventTitle: 'Soiree Page 1' }],
          unreadCount: 2,
          hasMore: true,
        });
      })
    );

    renderPage();

    await screen.findByText(/Soiree Page 1/);
    const loadMoreBtn = await screen.findByRole('button', { name: /charger la suite/i });

    await user.click(loadMoreBtn);

    await screen.findByText(/Soiree Page 2/);
    expect(screen.queryByRole('button', { name: /charger la suite/i })).not.toBeInTheDocument();
  });

  it('shows a notification once when a new one shifted the next page while the inbox was open', async () => {
    const user = userEvent.setup();
    const cancelled = (id: string, eventTitle: string, createdAt: string) => ({
      ...base,
      id,
      type: 'eventdeleted',
      eventTitle,
      createdAt,
    });
    const third = cancelled('n3', 'Soiree Trois', '2026-06-03T10:00:00Z');
    const second = cancelled('n2', 'Soiree Deux', '2026-06-02T10:00:00Z');
    const first = cancelled('n1', 'Soiree Une', '2026-06-01T10:00:00Z');
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, ({ request }) => {
        const offset = new URL(request.url).searchParams.get('offset');
        if (offset === '2') {
          return HttpResponse.json({ items: [second, first], unreadCount: 4, hasMore: false });
        }
        return HttpResponse.json({ items: [third, second], unreadCount: 3, hasMore: true });
      })
    );

    renderPage();
    await screen.findByText(/Soiree Deux/);
    await user.click(await screen.findByRole('button', { name: /charger la suite/i }));

    await screen.findByText(/Soiree Une/);
    expect(screen.getAllByText(/Soiree Deux/)).toHaveLength(1);
    expect(screen.getAllByText(/Soiree Trois/)).toHaveLength(1);
  });

  it("n'affiche pas le bouton 'charger la suite' quand hasMore est faux", async () => {
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({
          items: [{ ...base, id: 'a', type: 'eventdeleted', eventTitle: 'Soiree' }],
          unreadCount: 1,
          hasMore: false,
        })
      )
    );

    renderPage();

    await screen.findByText(/Soiree/);
    expect(screen.queryByRole('button', { name: /charger la suite/i })).not.toBeInTheDocument();
  });

  it("n'affiche pas le bouton 'tout marquer comme lu' quand il n'y a aucun non-lu", async () => {
    server.use(
      authedUserHandler,
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({
          items: [{ ...base, id: 'a', type: 'eventdeleted', eventTitle: 'Soiree', isRead: true }],
          unreadCount: 0,
        })
      )
    );

    renderPage();

    await screen.findByText(/Soiree/);
    expect(
      screen.queryByRole('button', { name: /tout marquer comme lu/i })
    ).not.toBeInTheDocument();
  });

  describe('friend groups', () => {
    it('asks to answer an invitation to a group, and opens the group once accepted', async () => {
      let accepted = false;
      server.use(
        authedUserHandler,
        serveInbox([GROUP_INVITATION]),
        ignoreRead,
        http.post(`${TEST_API_V1}/groups/g9/invitation/accept`, () => {
          accepted = true;
          return HttpResponse.json({ id: 'g9', name: 'Les jeudis ciné' });
        })
      );
      const user = userEvent.setup();
      renderInbox();

      expect(
        await screen.findByText(
          (_, element) =>
            element?.tagName === 'P' &&
            element.textContent === 'Léa vous invite à rejoindre le groupe « Les jeudis ciné »'
        )
      ).toBeInTheDocument();
      await user.click(
        screen.getByRole('button', { name: 'Accepter l’invitation au groupe « Les jeudis ciné »' })
      );

      expect(await screen.findByText('Page du groupe')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/groupes/g9');
      expect(accepted).toBe(true);
    });

    it('declines an invitation to a group without leaving the inbox', async () => {
      let declined = false;
      server.use(
        authedUserHandler,
        serveInbox([GROUP_INVITATION]),
        ignoreRead,
        http.post(`${TEST_API_V1}/groups/g9/invitation/decline`, () => {
          declined = true;
          return new HttpResponse(null, { status: 204 });
        })
      );
      const user = userEvent.setup();
      renderInbox();

      await user.click(
        await screen.findByRole('button', {
          name: 'Refuser l’invitation au groupe « Les jeudis ciné »',
        })
      );

      await waitFor(() => expect(declined).toBe(true));
      expect(screen.getByTestId('location')).toHaveTextContent('/notifications');
    });

    it('announces a night of a group and opens it', async () => {
      server.use(authedUserHandler, serveInbox([GROUP_NIGHT]), ignoreRead);
      const user = userEvent.setup();
      renderInbox();

      const link = await screen.findByRole('link', {
        name: /Sam vous attend à Halloween en retard, dans le groupe « Les jeudis ciné »/,
      });
      await user.click(link);

      expect(await screen.findByText('Page de la soirée')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/e/halloween');
    });
  });
});
