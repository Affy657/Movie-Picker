import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import MyEventsPage from '@/features/events/pages/MyEventsPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, createEventDetailHandlers, TEST_API_V1 } from '@/mocks/handlers';
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
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

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

    // Timeout étendu : sur Windows / jsdom lent l'enchaînement auth/me + events/mine
    // peut dépasser le timeout par défaut (1 s) de waitFor lors d'un run complet.
    await screen.findByRole('heading', { name: /créées/i }, { timeout: 5000 });

    expect(screen.getByRole('heading', { name: 'Mes soirées', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /rejointes/i })).toBeInTheDocument();

    const hostedLink = screen.getByRole('link', { name: /Chez moi/i });
    expect(hostedLink).toHaveAttribute('href', '/e/ma-soiree');
    expect(
      within(hostedLink.closest('li')!).getByText(/4\s*\/\s*8 participants/)
    ).toBeInTheDocument();
    expect(within(hostedLink.closest('li')!).getByText(/2 films propos/)).toBeInTheDocument();
    expect(screen.getAllByLabelText('Hôte').length).toBeGreaterThanOrEqual(1);

    const joinedLink = screen.getByRole('link', { name: /Chez Bob/i });
    expect(joinedLink).toHaveAttribute('href', '/e/autre');
    expect(screen.getByText('En cours')).toBeInTheDocument();

    // L'historique vit dans son propre onglet : on doit y basculer pour le tester.
    const userEvt = (await import('@testing-library/user-event')).default.setup();
    await userEvt.click(screen.getByRole('tab', { name: /historique/i }));

    const historyHeading = await screen.findByRole('heading', { name: /historique/i });
    const historySection = historyHeading.closest('section')!;
    const historyLink = within(historySection).getByRole('link', { name: /Soirée passée/i });
    expect(historyLink).toHaveAttribute('href', '/e/terminee');
    expect(within(historySection).queryByText('Terminée')).not.toBeInTheDocument();

    // Retour sur l'onglet actif pour vérifier l'isolement des sections.
    await userEvt.click(screen.getByRole('tab', { name: /à venir/i }));
    const hostedHeading = await screen.findByRole('heading', { name: /créées/i });
    const hostedSection = hostedHeading.closest('section')!;
    expect(within(hostedSection).queryByText(/Soirée passée/i)).not.toBeInTheDocument();

    expect(document.title).toBe(pageTitle('Mes soirées'));
  });

  it('invité : liste les soirées rejointes (session) sans bouton créer', async () => {
    const slug = 'soiree-invite';
    sessionStorage.setItem(
      `moviepicker_participant_${slug}`,
      JSON.stringify({ participantId: 'p-guest', pseudo: 'Invité' })
    );

    server.use(
      authMeGuestHandler,
      ...createEventDetailHandlers({ slug, title: 'Soirée chez Kim' })
    );

    renderMyEvents();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Soirée chez Kim/i })).toBeInTheDocument();
    });

    const guestLink = screen.getByRole('link', { name: /Soirée chez Kim/i });
    expect(within(guestLink.closest('li')!).getByText(/3 participants/)).toBeInTheDocument();
    expect(within(guestLink.closest('li')!).getByText(/2 films propos/)).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /Créer une soirée/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Se connecter/i })).toHaveAttribute(
      'href',
      expect.stringContaining('login')
    );

    sessionStorage.removeItem(`moviepicker_participant_${slug}`);
  });

  it('invité : message dédié si aucune soirée enregistrée ne charge', async () => {
    const slug = 'slug-introuvable';
    sessionStorage.setItem(
      `moviepicker_participant_${slug}`,
      JSON.stringify({ participantId: 'p1', pseudo: 'X' })
    );

    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/events/slug/${slug}`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })
      )
    );

    renderMyEvents();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/Aucune soirée enregistrée ici/i);
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();

    sessionStorage.removeItem(`moviepicker_participant_${slug}`);
  });

  it('connecté : fusionne les soirées rejointes en tant qu’invité (sessionStorage)', async () => {
    const guestSlug = 'soiree-invite-connecte';
    sessionStorage.setItem(
      `moviepicker_participant_${guestSlug}`,
      JSON.stringify({ participantId: 'p-guest', pseudo: 'Invité' })
    );

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
              id: 'e-host',
              slug: 'soiree-hote',
              title: 'Hôte propre',
              date: '2035-08-01',
              time: '22:00',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
              isCreator: true,
              isParticipant: true,
              lifecycle: 'upcoming',
              participantCount: 1,
              movieCount: 0,
            },
          ],
        })
      ),
      ...createEventDetailHandlers({ slug: guestSlug, title: 'Soirée d’Élio' })
    );

    renderMyEvents();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Soirée d’Élio/i })).toBeInTheDocument();
    });

    const joinedHeading = screen.getByRole('heading', { name: /rejointes/i });
    const joinedSection = joinedHeading.closest('section')!;
    expect(within(joinedSection).getByText(/Soirée d’Élio/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Hôte propre/i })).toBeInTheDocument();

    sessionStorage.removeItem(`moviepicker_participant_${guestSlug}`);
  });

  it('connecté : ne duplique pas la soirée invité si elle est déjà retournée par /events/mine', async () => {
    const slug = 'soiree-double';
    sessionStorage.setItem(
      `moviepicker_participant_${slug}`,
      JSON.stringify({ participantId: 'p-guest', pseudo: 'Alice' })
    );

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
              id: 'e-double',
              slug,
              title: 'Soirée déjà liée',
              date: '2035-08-01',
              time: '22:00',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
              isCreator: false,
              isParticipant: true,
              lifecycle: 'upcoming',
              participantCount: 4,
              movieCount: 1,
            },
          ],
        })
      ),
      ...createEventDetailHandlers({ slug, title: 'Soirée déjà liée' })
    );

    renderMyEvents();

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /Soirée déjà liée/i })).toHaveLength(1);
    });

    sessionStorage.removeItem(`moviepicker_participant_${slug}`);
  });

  it('invité : bandeau si une soirée sur deux ne charge pas', async () => {
    const ok = 'soiree-ok';
    const ko = 'soiree-ko';
    sessionStorage.setItem(
      `moviepicker_participant_${ok}`,
      JSON.stringify({ participantId: 'p1', pseudo: 'A' })
    );
    sessionStorage.setItem(
      `moviepicker_participant_${ko}`,
      JSON.stringify({ participantId: 'p2', pseudo: 'B' })
    );

    server.use(
      authMeGuestHandler,
      ...createEventDetailHandlers({ slug: ok, title: 'Soirée OK' }),
      http.get(`${TEST_API_V1}/events/slug/${ko}`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })
      )
    );

    renderMyEvents();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Soirée OK/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Certaines soirées mémorisées/i)).toBeInTheDocument();
    expect(screen.getByText(/\(\s*1\s*\)/)).toBeInTheDocument();

    sessionStorage.removeItem(`moviepicker_participant_${ok}`);
    sessionStorage.removeItem(`moviepicker_participant_${ko}`);
  });
});
