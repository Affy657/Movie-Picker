import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import InboxBell from '@/features/notifications/components/InboxBell';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { ROUTES } from '@/app/routes';

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

  it('affiche un lien vers la page notifications sans badge quand inbox vide', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/notifications/inbox`, () =>
        HttpResponse.json({ items: [], unreadCount: 0 })
      )
    );

    renderBell();

    const link = await screen.findByRole('link', { name: /notifications/i });
    expect(link).toHaveAttribute('href', ROUTES.notifications);
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
});
