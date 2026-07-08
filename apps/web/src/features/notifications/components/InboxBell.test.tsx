import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import InboxBell from '@/features/notifications/components/InboxBell';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

function renderBell() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <InboxBell />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('InboxBell (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche le bouton cloche sans badge quand inbox vide', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({ items: [], unreadCount: 0 })
      )
    );

    renderBell();

    const btn = await screen.findByRole('button', { name: /notifications/i });
    expect(btn).toBeInTheDocument();
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
  });

  it('affiche un badge avec le nombre de non lus', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({ items: [], unreadCount: 4 })
      )
    );

    renderBell();

    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  it('affiche 9+ quand le nombre de non lus dépasse 9', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({ items: [], unreadCount: 12 })
      )
    );

    renderBell();

    await waitFor(() => {
      expect(screen.getByText('9+')).toBeInTheDocument();
    });
  });

  it("ouvre le dropdown et affiche 'Aucune notification' si inbox vide", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({ items: [], unreadCount: 0 })
      )
    );

    renderBell();
    await screen.findByRole('button', { name: /notifications/i });

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => {
      expect(screen.getByText(/aucune notification/i)).toBeInTheDocument();
    });
  });

  it('affiche un lien vers le profil de celui qui a suivi', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'n1',
              type: 'newfollower',
              actorHandle: 'bob',
              actorDisplayName: 'Bob',
              actorAvatarId: '',
              isRead: false,
              createdAt: '2026-06-03T10:00:00Z',
            },
          ],
          unreadCount: 1,
        })
      ),
      http.post(
        `${TEST_API_V1}/notifications/inbox/read-all`,
        () => new HttpResponse(null, { status: 204 })
      )
    );

    renderBell();
    await screen.findByRole('button', { name: /notifications/i });

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('rend chaque type de notification connu', async () => {
    const user = userEvent.setup();
    const base = { actorAvatarId: '', isRead: false, createdAt: '2026-06-03T10:00:00Z' };
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({
          items: [
            {
              ...base,
              id: 'a',
              type: 'participantjoined',
              eventSlug: 's1',
              eventTitle: 'Soiree A',
              actorDisplayName: 'Alice',
            },
            {
              ...base,
              id: 'b',
              type: 'movieadded',
              eventSlug: 's2',
              eventTitle: 'Soiree B',
              actorDisplayName: 'Bob',
              movieTitle: 'Matrix',
            },
            {
              ...base,
              id: 'c',
              type: 'moviepicked',
              eventSlug: 's3',
              eventTitle: 'Soiree C',
              movieTitle: 'Dune',
            },
            { ...base, id: 'd', type: 'eventdeleted', eventTitle: 'Soiree D' },
            { ...base, id: 'e', type: 'eventreminder1h', eventSlug: 's5', eventTitle: 'Soiree E' },
            { ...base, id: 'f', type: 'eventreminder24h', eventSlug: 's6', eventTitle: 'Soiree F' },
            {
              ...base,
              id: 'g',
              type: 'eventinvitation',
              eventSlug: 's7',
              eventTitle: 'Soiree G',
              actorDisplayName: 'Gaby',
            },
          ],
          unreadCount: 7,
        })
      ),
      http.post(
        `${TEST_API_V1}/notifications/inbox/read-all`,
        () => new HttpResponse(null, { status: 204 })
      )
    );

    renderBell();
    await user.click(await screen.findByRole('button', { name: /notifications/i }));

    for (const title of [
      'Soiree A',
      'Soiree B',
      'Soiree C',
      'Soiree D',
      'Soiree E',
      'Soiree F',
      'Soiree G',
    ]) {
      expect(await screen.findByText(title)).toBeInTheDocument();
    }
  });

  it("marque tout comme lu a l'ouverture quand il y a des non-lus", async () => {
    const user = userEvent.setup();
    let readAll = 0;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({ items: [], unreadCount: 3 })
      ),
      http.post(`${TEST_API_V1}/notifications/inbox/read-all`, () => {
        readAll += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderBell();
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    await waitFor(() => expect(readAll).toBe(1));
  });

  it("ne marque pas comme lu quand il n'y a aucun non-lu", async () => {
    const user = userEvent.setup();
    let readAll = 0;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({ items: [], unreadCount: 0 })
      ),
      http.post(`${TEST_API_V1}/notifications/inbox/read-all`, () => {
        readAll += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderBell();
    await screen.findByRole('button', { name: /notifications/i });
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    await screen.findByText(/aucune notification/i);
    expect(readAll).toBe(0);
  });
});
