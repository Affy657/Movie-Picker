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
      http.post(`${TEST_API_V1}/notifications/inbox/read-all`, () =>
        new HttpResponse(null, { status: 204 })
      )
    );

    renderBell();
    await screen.findByRole('button', { name: /notifications/i });

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });
});
