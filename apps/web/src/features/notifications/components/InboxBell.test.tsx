import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import InboxBell from '@/features/notifications/components/InboxBell';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
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
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(UNREAD_COUNT_URL, () => HttpResponse.json({ unreadCount: 0 }))
    );

    renderBell();

    const link = await screen.findByRole('link', { name: /notifications/i });
    expect(link).toHaveAttribute('href', ROUTES.notifications);
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
  });

  it('affiche un badge avec le nombre de non lus', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(UNREAD_COUNT_URL, () => HttpResponse.json({ unreadCount: 4 }))
    );

    renderBell();

    expect(await screen.findByText('4')).toBeInTheDocument();
  });

  it('shows 9+ when the unread count exceeds 9', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(UNREAD_COUNT_URL, () => HttpResponse.json({ unreadCount: 12 }))
    );

    renderBell();

    expect(await screen.findByText('9+')).toBeInTheDocument();
  });

  it('reads the counter route and leaves the list to the notifications page', async () => {
    let listRequests = 0;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(UNREAD_COUNT_URL, () => HttpResponse.json({ unreadCount: 2 })),
      http.get(`${TEST_API_V1}/notifications/inbox`, () => {
        listRequests += 1;
        return HttpResponse.json({ items: [], unreadCount: 2, hasMore: false });
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
