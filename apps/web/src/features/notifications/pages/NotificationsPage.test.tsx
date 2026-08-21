import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
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

describe('NotificationsPage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("affiche l'état vide quand il n'y a aucune notification", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({ items: [], unreadCount: 0 })
      )
    );

    renderPage();

    expect(await screen.findByText(/aucune notification/i)).toBeInTheDocument();
  });

  it('regroupe deux notifications de la même soirée sous un seul en-tête', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
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

    // Le titre de la soirée apparaît aussi en gras dans chaque ligne — seul l'en-tête du groupe
    // (un <p>, pas un <strong>) doit être unique.
    const headers = await screen.findAllByText('Soiree Groupee', { selector: 'p' });
    expect(headers).toHaveLength(1);
  });

  it('un lien follower pointe vers le profil, et le clic marque la notif comme lue', async () => {
    const user = userEvent.setup();
    let markedId: string | null = null;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
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

  it("une notification 'soirée annulée' n'est pas cliquable vers une destination", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
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

  it("le bouton 'tout marquer comme lu' appelle l'API read-all", async () => {
    const user = userEvent.setup();
    let readAll = 0;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
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
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
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

  it("n'affiche pas le bouton 'charger la suite' quand hasMore est faux", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
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
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
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
});
