import type { ReactNode } from 'react';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { TEST_API_V1, authMeGuestHandler } from '@/mocks/handlers';
import HostEventSettingsPanel from '@/features/events/components/HostEventSettingsPanel';
import type { EventData } from '@/features/events/types';
import {
  setStoredHostToken,
  setStoredParticipant,
  getStoredParticipant,
  getStoredHostToken,
} from '@/features/events/storage';

// jsdom n'implémente pas <dialog>.showModal/close — stub minimal pour
// ConfirmDialog (rendu inconditionnellement par le panel).
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  }
});

function renderWithRouter(ui: ReactNode, qc = createTestQueryClient()) {
  return render(
    <AppTestProviders client={qc}>
      <MemoryRouter initialEntries={['/e/' + slug]}>
        <Routes>
          <Route path="/e/:slug" element={<>{ui}</>} />
          <Route path="/my-events" element={<div data-testid="route-my-events" />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

const slug = 'evt-settings';
const baseEvent: EventData = {
  id: 'e1',
  title: 'Test',
  date: '2030-01-01',
  time: '20:00',
  slug,
  isHost: true,
  isFinished: false,
  config: {
    theme: 'SF',
    endDate: null,
    maxProposalsPerParticipant: null,
    maxParticipants: null,
    wheelMode: 'strictRandom',
    richSharePreview: false,
  },
};

describe('HostEventSettingsPanel', () => {
  const server = setupServer(authMeGuestHandler);

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('ouvre le panneau et envoie un PATCH config', async () => {
    const user = userEvent.setup();
    let patched = false;
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        patched = true;
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.theme).toBe('SF');
        expect(body.wheelMode).toBe('strictRandom');
        expect(body.richSharePreview).toBe(false);
        expect(body.allowedReactionIds).toBeUndefined();
        return HttpResponse.json({
          theme: 'SF',
          endDate: null,
          maxProposalsPerParticipant: null,
          maxParticipants: null,
          wheelMode: 'strictRandom',
          richSharePreview: false,
        });
      })
    );

    const qc = createTestQueryClient();
    renderWithRouter(<HostEventSettingsPanel slug={slug} hostToken={null} event={baseEvent} />, qc);

    await user.click(screen.getByText('Paramètres de la soirée'));
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await waitFor(() => expect(patched).toBe(true));
    await waitFor(() => expect(screen.getByText(/enregistrés/i)).toBeInTheDocument());
  });

  it('envoie richSharePreview true quand la case est cochée', async () => {
    const user = userEvent.setup();
    let seenRich: boolean | undefined;
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        seenRich = body.richSharePreview === true;
        return HttpResponse.json({
          theme: 'SF',
          endDate: null,
          maxProposalsPerParticipant: null,
          maxParticipants: null,
          wheelMode: 'strictRandom',
          richSharePreview: true,
        });
      })
    );

    renderWithRouter(<HostEventSettingsPanel slug={slug} hostToken={null} event={baseEvent} />);

    await user.click(screen.getByText('Paramètres de la soirée'));
    await user.click(screen.getByRole('checkbox', { name: /aperçu de lien détaillé/i }));
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await waitFor(() => expect(seenRich).toBe(true));
  });

  it('envoie maxParticipants saisi dans le PATCH', async () => {
    const user = userEvent.setup();
    let seenMax: unknown;
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        seenMax = body.maxParticipants;
        return HttpResponse.json({
          theme: 'SF',
          endDate: null,
          maxProposalsPerParticipant: null,
          maxParticipants: 8,
          wheelMode: 'strictRandom',
          richSharePreview: false,
        });
      })
    );

    renderWithRouter(
      <HostEventSettingsPanel
        slug={slug}
        hostToken={null}
        event={{ ...baseEvent, participantCount: 2 }}
      />
    );

    await user.click(screen.getByText('Paramètres de la soirée'));
    await user.clear(screen.getByLabelText(/nombre maximum de participants/i));
    await user.type(screen.getByLabelText(/nombre maximum de participants/i), '8');
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await waitFor(() => expect(seenMax).toBe(8));
  });

  it('refuse une capacité inférieure au nombre de participants déjà inscrits', async () => {
    const user = userEvent.setup();
    let patchCalled = false;
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, () => {
        patchCalled = true;
        return HttpResponse.json({});
      })
    );

    renderWithRouter(
      <HostEventSettingsPanel
        slug={slug}
        hostToken={null}
        event={{ ...baseEvent, participantCount: 5 }}
      />
    );

    await user.click(screen.getByText('Paramètres de la soirée'));
    await user.clear(screen.getByLabelText(/nombre maximum de participants/i));
    await user.type(screen.getByLabelText(/nombre maximum de participants/i), '3');
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    expect(await screen.findByText(/Impossible de réduire la capacité/i)).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });

  it('désactive le formulaire si la roue a été lancée', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <HostEventSettingsPanel
        slug={slug}
        hostToken={null}
        event={{
          ...baseEvent,
          winnerMovie: {
            id: 'm1',
            eventId: 'e1',
            participantId: 'p1',
            tmdbId: 1,
            title: 'Gagnant',
            year: '2020',
            posterPath: null,
            proposerPseudo: 'A',
            score: 0,
            up: 0,
            down: 0,
          },
        }}
      />
    );

    await user.click(screen.getByText('Paramètres de la soirée'));
    expect(screen.getByText(/n'est plus modifiable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^enregistrer$/i })).toBeDisabled();
  });

  describe('zone de danger (suppression)', () => {
    const myPid = 'p-self';

    function eventAsConnectedCreator(): EventData {
      // L'utilisateur courant est lié à un participant marqué `isCreator: true`.
      return {
        ...baseEvent,
        myParticipant: { id: myPid, pseudo: 'Hôte' },
        participants: [
          { id: myPid, pseudo: 'Hôte', isCreator: true },
          { id: 'p2', pseudo: 'Alice', isCreator: false },
        ],
      };
    }

    it("ne montre PAS la zone de danger si l'utilisateur n'est pas le créateur connecté", async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <HostEventSettingsPanel slug={slug} hostToken="ht-only" event={baseEvent} />
      );
      await user.click(screen.getByText('Paramètres de la soirée'));
      expect(screen.queryByTestId('host-danger-zone')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-event-button')).not.toBeInTheDocument();
    });

    it('montre la zone de danger pour le créateur connecté', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <HostEventSettingsPanel slug={slug} hostToken={null} event={eventAsConnectedCreator()} />
      );
      await user.click(screen.getByText('Paramètres de la soirée'));
      expect(screen.getByTestId('host-danger-zone')).toBeInTheDocument();
      expect(screen.getByTestId('delete-event-button')).toBeInTheDocument();
    });

    it('confirme la modale → DELETE appelé + nettoyage local + redirection', async () => {
      const user = userEvent.setup();
      let deleteCalled = false;
      let calledUrl = '';
      server.use(
        http.delete(`${TEST_API_V1}/events/${slug}`, ({ request }) => {
          deleteCalled = true;
          calledUrl = request.url;
          return HttpResponse.json({
            eventId: 'e1',
            slug,
            removedParticipants: 2,
            removedMovies: 0,
            removedVotes: 0,
            removedSeenMarks: 0,
            message: 'Soirée supprimée.',
          });
        })
      );

      // Données locales pour vérifier le nettoyage post-suppression.
      setStoredParticipant(slug, myPid, 'Hôte');
      setStoredHostToken(slug, 'ht-1');

      renderWithRouter(
        <HostEventSettingsPanel slug={slug} hostToken="ht-1" event={eventAsConnectedCreator()} />
      );

      await user.click(screen.getByText('Paramètres de la soirée'));
      await user.click(screen.getByTestId('delete-event-button'));
      // La modale s'ouvre puis on confirme.
      await user.click(await screen.findByTestId('delete-event-confirm-dialog-confirm'));

      await waitFor(() => expect(deleteCalled).toBe(true));
      expect(calledUrl).toContain(`/events/${slug}`);
      expect(calledUrl).not.toContain('/participants/');

      await waitFor(() => expect(getStoredParticipant(slug)).toBeNull());
      expect(getStoredHostToken(slug)).toBeNull();

      await waitFor(() => expect(screen.getByTestId('route-my-events')).toBeInTheDocument());
    });

    it('annule la modale → aucun DELETE émis', async () => {
      const user = userEvent.setup();
      let deleteCalled = false;
      server.use(
        http.delete(`${TEST_API_V1}/events/${slug}`, () => {
          deleteCalled = true;
          return HttpResponse.json({});
        })
      );

      renderWithRouter(
        <HostEventSettingsPanel slug={slug} hostToken={null} event={eventAsConnectedCreator()} />
      );
      await user.click(screen.getByText('Paramètres de la soirée'));
      await user.click(screen.getByTestId('delete-event-button'));
      await user.click(await screen.findByTestId('delete-event-confirm-dialog-cancel'));

      // Petite pause asynchrone pour s'assurer qu'aucune mutation n'a démarré.
      await new Promise((r) => setTimeout(r, 30));
      expect(deleteCalled).toBe(false);
    });

    it('API renvoie 403 → message d\u2019erreur affiché, pas de redirection', async () => {
      const user = userEvent.setup();
      server.use(
        http.delete(`${TEST_API_V1}/events/${slug}`, () =>
          // Forme alignée avec `ApiErrorResponse` côté API (champ `error` lu par
          // `fetchApi` pour produire le message utilisateur).
          HttpResponse.json(
            { error: 'Seul le créateur peut supprimer la soirée.', code: 403 },
            { status: 403 }
          )
        )
      );

      renderWithRouter(
        <HostEventSettingsPanel slug={slug} hostToken={null} event={eventAsConnectedCreator()} />
      );
      await user.click(screen.getByText('Paramètres de la soirée'));
      await user.click(screen.getByTestId('delete-event-button'));
      await user.click(await screen.findByTestId('delete-event-confirm-dialog-confirm'));

      // Le composant doit afficher le message métier renvoyé par l'API
      // (propagé via `getErrorMessage(e)` depuis `ApiError.message`) sans naviguer.
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/seul le créateur/i));
      expect(screen.queryByTestId('route-my-events')).not.toBeInTheDocument();
    });
  });
});
