import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import EventDetail from '@/features/events/pages/EventDetail';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import {
  TEST_API_V1,
  authMeGuestHandler,
  createEventDetailHandlers,
  createJoinHandler,
  createSearchAndAddHandlers,
} from '@/mocks/handlers';
import { http, HttpResponse } from 'msw';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { setStoredParticipant, getStoredParticipant } from '@/features/events/storage';

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

function renderEventDetail(initialPath: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/e/:slug" element={<EventDetail />} />
          <Route path="/my-events" element={<div data-testid="route-my-events" />} />
          <Route path="/" element={<div data-testid="route-home" />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

async function openParticipantsPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId('participants-toggle'));
}

async function openParticipantsManageMode(user: ReturnType<typeof userEvent.setup>) {
  await openParticipantsPanel(user);
  await user.click(await screen.findByTestId('manage-participants-toggle'));
}

describe('EventDetail (MSW)', () => {
  const slug = 'soiree-msw';

  const server = setupServer(
    authMeGuestHandler,
    ...createEventDetailHandlers({ slug, title: 'Soirée démo' }),
    createJoinHandler(slug),
    ...createSearchAndAddHandlers(slug)
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    sessionStorage.clear();
  });
  afterAll(() => server.close());

  it('non connecté : affiche la soirée et les CTA pour rejoindre, pas les films', async () => {
    renderEventDetail(`/e/${slug}`);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /rejoindre la soirée/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^se connecter$/i })).toHaveAttribute(
      'href',
      `/login?returnTo=${encodeURIComponent(`/e/${slug}`)}`
    );
    expect(screen.getByRole('link', { name: /^créer un compte$/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /films proposés/i })).not.toBeInTheDocument();
  });

  it('affiche une erreur si la soirée est introuvable (404)', async () => {
    server.use(
      http.get(`${TEST_API_V1}/events/slug/:s`, () =>
        HttpResponse.json({ error: 'introuvable' }, { status: 404 })
      ),
      http.get(`${TEST_API_V1}/events/:s/movies`, () => HttpResponse.json([]))
    );
    renderEventDetail(`/e/inconnu`);
    await waitFor(() => {
      expect(screen.getByText(/n'existe pas|introuvable/i)).toBeInTheDocument();
    });
    expect(document.title).toBe(pageTitle('Soirée introuvable'));
  });

  it('affiche le lien invité et le QR pour un simple participant (sans token hôte)', async () => {
    const user = userEvent.setup();
    renderEventDetail(`/e/${slug}`);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /inviter/i }));
    expect(screen.getByRole('button', { name: /^partager$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /afficher le qr code/i })).toBeInTheDocument();
    expect(screen.queryByText('Votre lien hôte (ne pas partager)')).not.toBeInTheDocument();
  });

  it('en tant qu’hôte n’affiche plus de lien « hôte » séparé (seul le lien public)', async () => {
    const user = userEvent.setup();
    const token = 'host-secret-token';
    renderEventDetail(`/e/${slug}?host=${encodeURIComponent(token)}`);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument();
    });
    expect(document.title).toBe(pageTitle('Soirée démo'));
    await user.click(screen.getByRole('button', { name: /inviter/i }));
    expect(screen.getByRole('button', { name: /^partager$/i })).toBeInTheDocument();
    expect(screen.queryByText('Votre lien hôte (ne pas partager)')).not.toBeInTheDocument();
  });

  it('en tant qu’hôte affiche le bandeau thème et le panneau paramètres', async () => {
    const token = 'host-secret-token';
    server.use(
      ...createEventDetailHandlers({ slug, title: 'Soirée démo', theme: 'Comédie noire' }),
      createJoinHandler(slug),
      ...createSearchAndAddHandlers(slug)
    );
    renderEventDetail(`/e/${slug}?host=${encodeURIComponent(token)}`);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument();
    });
    expect(screen.getByText('Comédie noire')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /Thème de soirée/i })).toBeInTheDocument();

    const settingsToggle = screen.getByRole('button', { name: 'Paramètres de la soirée' });
    expect(settingsToggle).toHaveAttribute('aria-haspopup', 'dialog');
    const settingsDialog = document.querySelector('dialog[aria-labelledby]');
    expect(settingsDialog).not.toHaveAttribute('open');

    await userEvent.setup().click(settingsToggle);
    await waitFor(() => expect(settingsDialog).toHaveAttribute('open'));
    expect(screen.getByLabelText(/nom de la soirée/i)).toBeInTheDocument();
  });

  it('affiche erreur films + Réessayer si le chargement des films échoue', async () => {
    server.use(
      http.get(`${TEST_API_V1}/events/:slug/movies`, () =>
        HttpResponse.json({ error: 'Service indisponible' }, { status: 503 })
      )
    );
    renderEventDetail(`/e/${slug}`);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/indisponible|Service/i)).toBeInTheDocument();
  });

  it('après rejoindre, affiche la section Films et permet de proposer un film', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u1',
          displayName: 'Bob',
          emailMasked: 'b***@test.local',
          uiTheme: 'system',
          accentColor: 'default',
        })
      )
    );
    renderEventDetail(`/e/${slug}`);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /rejoindre/i })).toBeInTheDocument()
    );
    await user.click(await screen.findByRole('button', { name: /rejoindre/i }));

    await user.click(await screen.findByRole('button', { name: /proposer un film/i }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/ajouter un film/i)).toBeInTheDocument()
    );
    await user.type(screen.getByPlaceholderText(/ajouter un film/i), 'Test');
    await user.click(screen.getByRole('button', { name: /^rechercher$/i }));
    await waitFor(() => expect(screen.getByText(/film test/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));
    await waitFor(() => expect(screen.queryByText(/film test/i)).not.toBeInTheDocument());
  });

  describe('flux retrait participant (hôte)', () => {
    function setupHostJoined() {
      setStoredParticipant(slug, 'p-msw-host', 'Hôte');
    }

    it('confirme la modale → DELETE appelé + message de succès affiché', async () => {
      const user = userEvent.setup();
      setupHostJoined();
      let deleteCalled = false;
      let deleteUrl = '';
      server.use(
        http.delete(`${TEST_API_V1}/events/${slug}/participants/:pid`, ({ request, params }) => {
          deleteCalled = true;
          deleteUrl = request.url;
          return HttpResponse.json({
            participantId: params.pid,
            eventId: 'evt-msw',
            removedMovies: 0,
            message: 'Participant retiré.',
          });
        })
      );

      renderEventDetail(`/e/${slug}?host=host-token`);
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument()
      );

      await openParticipantsManageMode(user);
      const removeButton = await screen.findByTestId('remove-participant-p-msw-alice');
      await user.click(removeButton);

      const dialog = await screen.findByTestId('confirm-dialog');
      expect(dialog).toHaveAttribute('open');
      await user.click(screen.getByTestId('confirm-dialog-confirm'));

      await waitFor(() => expect(deleteCalled).toBe(true));
      expect(deleteUrl).toContain('/participants/p-msw-alice');
      expect(deleteUrl).toContain('host=host-token');

      await waitFor(() =>
        expect(screen.getByTestId('participants-action-success')).toBeInTheDocument()
      );
      expect(screen.getByTestId('participants-action-success')).toHaveTextContent('Alice');
    });

    it('annule la modale → aucun DELETE émis', async () => {
      const user = userEvent.setup();
      setupHostJoined();
      let deleteCalled = false;
      server.use(
        http.delete(`${TEST_API_V1}/events/${slug}/participants/:pid`, () => {
          deleteCalled = true;
          return HttpResponse.json({});
        })
      );

      renderEventDetail(`/e/${slug}?host=host-token`);
      await openParticipantsManageMode(user);
      const removeButton = await screen.findByTestId('remove-participant-p-msw-alice');
      await user.click(removeButton);

      await screen.findByTestId('confirm-dialog');
      await user.click(screen.getByTestId('confirm-dialog-cancel'));

      expect(deleteCalled).toBe(false);
    });

    it('API renvoie 409 (roue lancée) → message d’erreur affiché', async () => {
      const user = userEvent.setup();
      setupHostJoined();
      server.use(
        http.delete(`${TEST_API_V1}/events/${slug}/participants/:pid`, () =>
          HttpResponse.json(
            {
              error:
                'La roue a déjà été lancée : la liste des participants ne peut plus être modifiée.',
              code: 409,
            },
            { status: 409 }
          )
        )
      );

      renderEventDetail(`/e/${slug}?host=host-token`);
      await openParticipantsManageMode(user);
      const removeButton = await screen.findByTestId('remove-participant-p-msw-alice');
      await user.click(removeButton);
      await user.click(screen.getByTestId('confirm-dialog-confirm'));

      await waitFor(() => expect(screen.getByText(/déjà été lancée/i)).toBeInTheDocument());
    });
  });

  describe('flux quitter (participant)', () => {
    it('le créateur ne voit pas le bouton « Quitter » (masqué côté UI)', async () => {
      const user = userEvent.setup();
      const myPid = 'p-msw-host';
      setStoredParticipant(slug, myPid, 'Hôte');
      server.use(
        http.get(`${TEST_API_V1}/events/slug/${slug}`, () =>
          HttpResponse.json({
            _id: 'evt-msw',
            title: 'Soirée démo',
            date: '2030-12-15',
            time: '21:00',
            slug,
            isHost: true,
            isFinished: false,
            winnerMovie: null,
            participantCount: 2,
            movieCount: 0,
            myParticipant: { _id: myPid, pseudo: 'Hôte' },
            participants: [
              { _id: myPid, pseudo: 'Hôte', isCreator: true },
              { _id: 'p-msw-alice', pseudo: 'Alice' },
            ],
            config: {
              theme: null,
              maxProposalsPerParticipant: null,
              maxParticipants: null,
              wheelMode: 'strictRandom',
            },
          })
        )
      );

      renderEventDetail(`/e/${slug}?host=host-token`);
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument()
      );
      await openParticipantsPanel(user);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByTestId('leave-event-button')).not.toBeInTheDocument();
    });

    it('utilisateur connecté : confirmation → DELETE appelé + navigation vers /my-events', async () => {
      const user = userEvent.setup();
      const myPid = 'p-msw-self';
      setStoredParticipant(slug, myPid, 'Moi');

      let deleteCalled = false;
      let deleteUrl = '';
      server.use(
        http.get(`${TEST_API_V1}/auth/me`, () =>
          HttpResponse.json({ id: 'user-1', email: 'me@example.com', displayName: 'Moi' })
        ),
        http.get(`${TEST_API_V1}/events/slug/${slug}`, () =>
          HttpResponse.json({
            _id: 'evt-msw',
            title: 'Soirée démo',
            date: '2030-12-15',
            time: '21:00',
            slug,
            isHost: false,
            isFinished: false,
            winnerMovie: null,
            participantCount: 4,
            movieCount: 0,
            myParticipant: { _id: myPid, pseudo: 'Moi' },
            participants: [
              { _id: 'p-msw-alice', pseudo: 'Alice' },
              { _id: 'p-msw-bob', pseudo: 'Bob' },
              { _id: myPid, pseudo: 'Moi' },
            ],
            config: {
              theme: null,
              maxProposalsPerParticipant: null,
              maxParticipants: null,
              wheelMode: 'strictRandom',
            },
          })
        ),
        http.delete(`${TEST_API_V1}/events/${slug}/participants/:pid`, ({ request, params }) => {
          deleteCalled = true;
          deleteUrl = request.url;
          return HttpResponse.json({
            participantId: params.pid,
            eventId: 'evt-msw',
            removedMovies: 0,
            message: 'Participant retiré.',
          });
        })
      );

      renderEventDetail(`/e/${slug}`);
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument()
      );

      await openParticipantsPanel(user);
      const leaveButton = await screen.findByTestId('leave-event-button');
      await user.click(leaveButton);
      await user.click(screen.getByTestId('confirm-dialog-confirm'));

      await waitFor(() => expect(deleteCalled).toBe(true));
      expect(deleteUrl).toContain(`/participants/${myPid}`);
      await waitFor(() => expect(getStoredParticipant(slug)).toBeNull());
      await waitFor(() => expect(screen.getByTestId('route-my-events')).toBeInTheDocument());
    });
  });

  describe('enchaînement de modales (instance unique)', () => {
    it('ouvrir retirer → annuler → ouvrir quitter : libellés cohérents', async () => {
      const user = userEvent.setup();
      setStoredParticipant(slug, 'p-msw-host', 'Hôte');

      renderEventDetail(`/e/${slug}?host=host-token`);
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Soirée démo' })).toBeInTheDocument()
      );

      await openParticipantsManageMode(user);
      await user.click(await screen.findByTestId('remove-participant-p-msw-alice'));
      const dialog1 = await screen.findByTestId('confirm-dialog');
      expect(dialog1).toHaveAttribute('open');
      expect(screen.getByTestId('confirm-dialog-confirm')).toHaveTextContent(/retirer/i);

      await user.click(screen.getByTestId('confirm-dialog-cancel'));
      await waitFor(() => expect(screen.getByTestId('confirm-dialog')).not.toHaveAttribute('open'));

      await user.click(screen.getByTestId('leave-event-button'));
      await waitFor(() => expect(screen.getByTestId('confirm-dialog')).toHaveAttribute('open'));
      expect(screen.getByTestId('confirm-dialog-confirm')).toHaveTextContent(/quitter/i);
      expect(screen.queryByText(/retirer.*alice/i)).not.toBeInTheDocument();
    });
  });
});
