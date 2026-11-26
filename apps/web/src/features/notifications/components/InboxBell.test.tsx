import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiJson } from '@/mocks/apiJson';
import InboxBell from '@/features/notifications/components/InboxBell';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';

const UNREAD_COUNT_URL = `${TEST_API_V1}/notifications/inbox/unread-count`;

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

  beforeAll(() => server.listen({ onUnhandledFrame: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche un lien vers la page notifications sans badge quand inbox vide', async () => {
    server.use(
      authMeGuestHandler,
      http.get(UNREAD_COUNT_URL, () =>
        apiJson<'NotificationUnreadCountResponse'>({ unreadCount: 0 })
      )
    );

    renderBell();

    const link = await screen.findByRole('link', { name: /notifications/i });
    expect(link).toHaveAttribute('href', ROUTES.notifications);
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
  });

  it('affiche un badge avec le nombre de non lus', async () => {
    server.use(
      authMeGuestHandler,
      http.get(UNREAD_COUNT_URL, () =>
        apiJson<'NotificationUnreadCountResponse'>({ unreadCount: 4 })
      )
    );

    renderBell();

    expect(await screen.findByText('4')).toBeInTheDocument();
  });

  it('shows 9+ when the unread count exceeds 9', async () => {
    server.use(
      authMeGuestHandler,
      http.get(UNREAD_COUNT_URL, () =>
        apiJson<'NotificationUnreadCountResponse'>({ unreadCount: 12 })
      )
    );

    renderBell();

    expect(await screen.findByText('9+')).toBeInTheDocument();
  });

  it('reads the counter route and leaves the list to the notifications page', async () => {
    let listRequests = 0;
    server.use(
      authMeGuestHandler,
      http.get(UNREAD_COUNT_URL, () =>
        apiJson<'NotificationUnreadCountResponse'>({ unreadCount: 2 })
      ),
      http.get(`${TEST_API_V1}/notifications/inbox`, () => {
        listRequests += 1;
        return apiJson<'NotificationInboxResponse'>({ items: [], unreadCount: 2, hasMore: false });
      })
    );

    renderBell();

    expect(await screen.findByText('2')).toBeInTheDocument();
    expect(listRequests).toBe(0);
  });

  it('keeps its query under the inbox key, so reading a notification refreshes the badge', () => {
    const { inbox, unreadCount } = queryKeys.notifications;

    expect(unreadCount.slice(0, inbox.length)).toEqual([...inbox]);
  });
});
