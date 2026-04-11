import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import MyEventsPage from '@/features/events/pages/MyEventsPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';

function renderMyEvents() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/mes-soirees']}>
        <Routes>
          <Route path="/mes-soirees" element={<MyEventsPage />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('MyEventsPage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche les sections, badges d’état et lien hôte', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u1',
          displayName: 'Alice',
          emailMasked: 'a***@test.local',
          uiTheme: 'system',
        })
      ),
      http.get(`${TEST_API_V1}/events/mine`, () =>
        HttpResponse.json({
          events: [
            {
              id: 'e1',
              slug: 'ma-soiree',
              title: 'Chez moi',
              date: '2035-08-01',
              time: '22:00',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
              isCreator: true,
              isParticipant: true,
              lifecycle: 'upcoming',
            },
            {
              id: 'e2',
              slug: 'autre',
              title: 'Chez Bob',
              date: '2035-09-01',
              time: '20:00',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-03T00:00:00Z',
              isCreator: false,
              isParticipant: true,
              lifecycle: 'live',
            },
            {
              id: 'e3',
              slug: 'terminee',
              title: 'Soirée passée',
              date: '2020-01-01',
              time: '20:00',
              createdAt: '2019-01-01T00:00:00Z',
              updatedAt: '2020-01-02T00:00:00Z',
              isCreator: true,
              isParticipant: true,
              lifecycle: 'finished',
            },
          ],
        })
      )
    );

    renderMyEvents();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /créées/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Mes soirées', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /rejointes/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /historique/i })).toBeInTheDocument();

    const hostedLink = screen.getByRole('link', { name: /Chez moi/i });
    expect(hostedLink).toHaveAttribute('href', '/s/ma-soiree');
    expect(screen.getAllByText('Hôte').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('À venir')).toBeInTheDocument();

    const joinedLink = screen.getByRole('link', { name: /Chez Bob/i });
    expect(joinedLink).toHaveAttribute('href', '/s/autre');
    expect(screen.getByText('En cours')).toBeInTheDocument();

    const historyHeading = screen.getByRole('heading', { name: /historique/i });
    const historySection = historyHeading.closest('section')!;
    const historyLink = within(historySection).getByRole('link', { name: /Soirée passée/i });
    expect(historyLink).toHaveAttribute('href', '/s/terminee');
    expect(within(historySection).queryByText('Terminée')).not.toBeInTheDocument();

    const hostedHeading = screen.getByRole('heading', { name: /créées/i });
    const hostedSection = hostedHeading.closest('section')!;
    expect(within(hostedSection).queryByText(/Soirée passée/i)).not.toBeInTheDocument();

    expect(document.title).toBe(pageTitle('Mes soirées'));
  });
});
