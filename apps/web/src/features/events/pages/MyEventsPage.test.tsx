import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import MyEventsPage from '@/features/events/pages/MyEventsPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { setStoredParticipant } from '@/features/events/storage';

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

const authMeHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    handle: 'alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
  })
);

function myEventsHandler(
  activeEvents: unknown[],
  finishedEvents: unknown[],
  totals: { active: number; finished: number }
) {
  return http.get(`${TEST_API_V1}/events/mine`, ({ request }) => {
    const url = new URL(request.url);
    const scope = url.searchParams.get('scope');
    return HttpResponse.json({
      events: scope === 'finished' ? finishedEvents : activeEvents,
      hasMore: false,
      totalActive: totals.active,
      totalFinished: totals.finished,
    });
  });
}

const statsHandler = http.get(`${TEST_API_V1}/users/alice/stats`, () =>
  HttpResponse.json({
    eventsCreated: 0,
    eventsJoined: 0,
    moviesProposed: 0,
    votesCast: 0,
    winningProposals: 0,
    moviesSeen: 9,
    currentStreakWeeks: 3,
    bestStreakWeeks: 3,
    favoriteGenres: [],
    dailyActivity: [],
  })
);

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

  it('affiche le bloc À traiter, la grille active et les compteurs d’onglets', async () => {
    server.use(
      authMeHandler,
      myEventsHandler(
        [
          {
            id: 'p1',
            slug: 'en-suspens',
            title: 'Soirée en suspens',
            date: '2020-01-01',
            time: '20:00',
            createdAt: '2019-01-01T00:00:00Z',
            updatedAt: '2020-01-02T00:00:00Z',
            isCreator: true,
            isParticipant: true,
            lifecycle: 'pending',
            participantCount: 1,
            movieCount: 0,
            autoCloseAt: '2099-01-01T00:00:00Z',
          },
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
        ],
        [],
        { active: 3, finished: 1 }
      )
    );

    renderMyEvents();

    await screen.findByRole('heading', { name: /à traiter/i }, { timeout: 5000 });

    expect(screen.getByRole('heading', { name: 'Mes soirées', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Soirée en suspens')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /choisir le film/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clôturer sans film/i })).toBeInTheDocument();

    const hostedLink = screen.getByRole('link', { name: /Chez moi/i });
    expect(hostedLink).toHaveAttribute('href', '/e/ma-soiree');
    expect(within(hostedLink.closest('li')!).getByText('4 / 8')).toBeInTheDocument();
    expect(screen.getAllByText('Hôte').length).toBeGreaterThanOrEqual(1);

    const joinedLink = screen.getByRole('link', { name: /Chez Bob/i });
    expect(joinedLink).toHaveAttribute('href', '/e/autre');
    expect(screen.getByText('En cours')).toBeInTheDocument();

    const activeTab = screen.getByRole('tab', { name: /actives/i });
    expect(within(activeTab).getByText('3')).toBeInTheDocument();
    const historyTab = screen.getByRole('tab', { name: /historique/i });
    expect(within(historyTab).getByText('1')).toBeInTheDocument();

    expect(document.title).toBe(pageTitle('Mes soirées'));
  });

  it('historique : ouvrir le menu et supprimer une soirée hôte terminée', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    let deleteCalled = false;
    server.use(
      authMeHandler,
      statsHandler,
      myEventsHandler(
        [],
        [
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
        { active: 0, finished: 1 }
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

  it('historique : un participant retire une soirée terminée de son historique', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    setStoredParticipant('rejointe-terminee', 'part-1', 'Alice');
    let removeCalled = false;
    server.use(
      authMeHandler,
      statsHandler,
      myEventsHandler(
        [],
        [
          {
            id: 'e4',
            slug: 'rejointe-terminee',
            title: 'Soirée rejointe',
            date: '2020-01-01',
            time: '20:00',
            createdAt: '2019-01-01T00:00:00Z',
            updatedAt: '2020-01-02T00:00:00Z',
            isCreator: false,
            isParticipant: true,
            lifecycle: 'finished',
            participantCount: 3,
            movieCount: 2,
          },
        ],
        { active: 0, finished: 1 }
      ),
      http.delete(`${TEST_API_V1}/events/rejointe-terminee/participants/part-1`, () => {
        removeCalled = true;
        return HttpResponse.json({ participantId: 'part-1', eventId: 'e4' });
      })
    );

    renderMyEvents();

    const historyTab = await screen.findByRole('tab', { name: /historique/i }, { timeout: 5000 });
    await user.click(historyTab);
    await screen.findByRole('link', { name: /Soirée rejointe/i });

    await user.click(screen.getByRole('button', { name: /Options pour Soirée rejointe/i }));
    await user.click(screen.getByRole('menuitem', { name: /retirer de mon historique/i }));

    const openDialog = screen.getAllByTestId('confirm-dialog').find((d) => d.hasAttribute('open'))!;
    await user.click(within(openDialog).getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(removeCalled).toBe(true));
  });

  it('historique : filtrer par résultat (avec/sans film choisi)', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    server.use(
      authMeHandler,
      statsHandler,
      myEventsHandler(
        [],
        [
          {
            id: 'e5',
            slug: 'avec-film',
            title: 'Soirée avec film',
            date: '2020-01-01',
            time: '20:00',
            createdAt: '2019-01-01T00:00:00Z',
            updatedAt: '2020-01-02T00:00:00Z',
            isCreator: true,
            isParticipant: true,
            lifecycle: 'finished',
            participantCount: 2,
            movieCount: 3,
            winnerMovieTitle: 'Matrix',
          },
          {
            id: 'e6',
            slug: 'sans-film',
            title: 'Soirée sans film',
            date: '2020-02-01',
            time: '20:00',
            createdAt: '2019-01-01T00:00:00Z',
            updatedAt: '2020-02-02T00:00:00Z',
            isCreator: true,
            isParticipant: true,
            lifecycle: 'finished',
            participantCount: 2,
            movieCount: 0,
            winnerMovieTitle: null,
          },
        ],
        { active: 0, finished: 2 }
      )
    );

    renderMyEvents();

    const historyTab = await screen.findByRole('tab', { name: /historique/i }, { timeout: 5000 });
    await user.click(historyTab);
    await screen.findByRole('link', { name: /Soirée avec film/i });
    expect(screen.getByRole('link', { name: /Soirée sans film/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /filtres/i }));
    await user.click(screen.getByRole('button', { name: /sans film choisi/i }));

    expect(screen.getByRole('link', { name: /Soirée sans film/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Soirée avec film/i })).not.toBeInTheDocument();
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
