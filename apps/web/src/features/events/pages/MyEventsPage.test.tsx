import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import MyEventsPage from '@/features/events/pages/MyEventsPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';

function clearGuestParticipantKeys() {
  const toRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith('moviepicker_participant_')) toRemove.push(k);
  }
  for (const k of toRemove) sessionStorage.removeItem(k);
}

function renderMyEvents() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/my-events']}>
        <Routes>
          <Route path="/my-events" element={<MyEventsPage />} />
          <Route path="/login" element={<div data-testid="route-login" />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '');
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
});

describe('MyEventsPage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    clearGuestParticipantKeys();
  });
  afterAll(() => server.close());

  it('affiche les sections, badges d’état et lien hôte', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u1',
          displayName: 'Alice',
          emailMasked: 'a***@test.local',
          uiTheme: 'system',
          accentColor: 'default',
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
              participantCount: 4,
              movieCount: 2,
              maxParticipants: 8,
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
              participantCount: 6,
              movieCount: 1,
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
              participantCount: 2,
              movieCount: 5,
            },
          ],
        })
      )
    );

    renderMyEvents();

    await screen.findByRole('heading', { name: /créées/i }, { timeout: 5000 });

    expect(screen.getByRole('heading', { name: 'Mes soirées', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /rejointes/i })).toBeInTheDocument();

    const hostedLink = screen.getByRole('link', { name: /Chez moi/i });
    expect(hostedLink).toHaveAttribute('href', '/e/ma-soiree');
    expect(within(hostedLink.closest('li')!).getByText('4 / 8')).toBeInTheDocument();
    expect(within(hostedLink.closest('li')!).getByText('2')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Hôte').length).toBeGreaterThanOrEqual(1);

    const joinedLink = screen.getByRole('link', { name: /Chez Bob/i });
    expect(joinedLink).toHaveAttribute('href', '/e/autre');
    expect(screen.getByText('En cours')).toBeInTheDocument();

    const userEvt = (await import('@testing-library/user-event')).default.setup();
    await userEvt.click(screen.getByRole('tab', { name: /historique/i }));

    const historyHeading = await screen.findByRole('heading', { name: /historique/i });
    const historySection = historyHeading.closest('section')!;
    const historyLink = within(historySection).getByRole('link', { name: /Soirée passée/i });
    expect(historyLink).toHaveAttribute('href', '/e/terminee');
    expect(within(historySection).queryByText('Terminée')).not.toBeInTheDocument();

    await userEvt.click(screen.getByRole('tab', { name: /à venir/i }));
    const hostedHeading = await screen.findByRole('heading', { name: /créées/i });
    const hostedSection = hostedHeading.closest('section')!;
    expect(within(hostedSection).queryByText(/Soirée passée/i)).not.toBeInTheDocument();

    expect(document.title).toBe(pageTitle('Mes soirées'));
  });

  it('historique : ouvrir le menu et supprimer une soirée hôte terminée', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    let deleteCalled = false;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u1',
          displayName: 'Alice',
          emailMasked: 'a***@test.local',
          uiTheme: 'system',
          accentColor: 'default',
        })
      ),
      http.get(`${TEST_API_V1}/events/mine`, () =>
        HttpResponse.json({
          events: [
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
              participantCount: 2,
              movieCount: 5,
            },
          ],
        })
      ),
      http.delete(`${TEST_API_V1}/events/terminee`, () => {
        deleteCalled = true;
        return HttpResponse.json({
          eventId: 'e3',
          slug: 'terminee',
          message: 'ok',
          removedParticipants: 2,
          removedMovies: 5,
          removedVotes: 0,
          removedSeenMarks: 0,
        });
      })
    );

    renderMyEvents();

    const historyTab = await screen.findByRole('tab', { name: /historique/i }, { timeout: 5000 });
    await user.click(historyTab);
    await screen.findByRole('link', { name: /Soirée passée/i });

    await user.click(screen.getByRole('button', { name: /Options pour Soirée passée/i }));
    await user.click(screen.getByRole('menuitem', { name: /supprimer/i }));

    const openDialog = screen.getAllByTestId('confirm-dialog').find((d) => d.hasAttribute('open'))!;
    await user.click(within(openDialog).getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(deleteCalled).toBe(true));
  });

  it('non connecté : ne rend pas la liste (redirection vers login)', async () => {
    server.use(authMeGuestHandler);

    renderMyEvents();

    await waitFor(() => {
      expect(screen.getByTestId('route-login')).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: /Créer une soirée/i })).not.toBeInTheDocument();
  });
});
