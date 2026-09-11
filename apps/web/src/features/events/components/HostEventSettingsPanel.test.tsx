import type { ReactNode } from 'react';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
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
    maxProposalsPerParticipant: null,
    maxParticipants: null,
    wheelMode: 'strictRandom',
    richSharePreview: false,
    winnerCount: 1,
    winnerCountMax: 10,
    drawnWinnerCount: 0,
  },
};

describe('HostEventSettingsPanel', () => {
  const server = setupServer(authMeGuestHandler);

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('reste ouvert une fois un film tiré et ne laisse réglable que le nombre de gagnants', () => {
    renderWithRouter(
      <HostEventSettingsPanel
        slug={slug}
        hostToken={null}
        event={{
          ...baseEvent,
          winners: [{ movieId: 'm1', pickMethod: 'wheel', pickedAt: '2030-01-01T20:00:00Z' }],
          config: { ...baseEvent.config!, winnerCount: 3, drawnWinnerCount: 1 },
        }}
        open
        onClose={() => {}}
      />
    );

    expect(screen.getByLabelText(/nom de la soir/i)).toBeDisabled();
    expect(screen.getByRole('radio', { name: /par les votes/i })).toBeDisabled();
    expect(screen.getByLabelText(/films gagnants/i)).toBeEnabled();
    expect(screen.getByText(/tirage a commenc/i)).toBeInTheDocument();
  });

  it('ouvre le panneau et envoie un PATCH config', async () => {
    const user = userEvent.setup();
    let patched = false;
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        patched = true;
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.wheelMode).toBe('weightedByVotes');
        expect(body.theme).toBeUndefined();
        expect(body.allowSeries).toBeUndefined();
        expect(body.allowedReactionIds).toBeUndefined();
        return HttpResponse.json({
          theme: 'SF',
          maxProposalsPerParticipant: null,
          maxParticipants: null,
          wheelMode: 'strictRandom',
          richSharePreview: false,
          allowSeries: false,
        });
      })
    );

    const qc = createTestQueryClient();
    renderWithRouter(
      <HostEventSettingsPanel
        slug={slug}
        hostToken={null}
        event={baseEvent}
        open
        onClose={() => {}}
      />,
      qc
    );

    await user.click(screen.getByRole('radio', { name: /pondéré par les votes/i }));

    await waitFor(() => expect(patched).toBe(true));
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
          maxProposalsPerParticipant: null,
          maxParticipants: 8,
          wheelMode: 'strictRandom',
          richSharePreview: false,
        });
      })
    );

    renderWithRouter(
      <HostEventSettingsPanel
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={{ ...baseEvent, participantCount: 2 }}
      />
    );

    await user.clear(screen.getByLabelText(/participants max/i));
    await user.type(screen.getByLabelText(/participants max/i), '8');

    await waitFor(() => expect(seenMax).toBe(8), { timeout: 3000 });
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
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={{ ...baseEvent, participantCount: 5 }}
      />
    );

    await user.clear(screen.getByLabelText(/participants max/i));
    await user.type(screen.getByLabelText(/participants max/i), '3');

    expect(
      await screen.findByText(/Impossible de réduire la capacité/i, {}, { timeout: 3000 })
    ).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });

  it('envoie le nombre de films à tirer saisi par l hôte', async () => {
    const user = userEvent.setup();
    let seenWinnerCount: unknown;
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        seenWinnerCount = body.winnerCount;
        return HttpResponse.json({ ...baseEvent.config, winnerCount: 3 });
      })
    );

    renderWithRouter(
      <HostEventSettingsPanel
        slug={slug}
        hostToken={null}
        event={baseEvent}
        open
        onClose={() => {}}
      />,
      createTestQueryClient()
    );

    await user.clear(screen.getByLabelText(/films gagnants/i));
    await user.type(screen.getByLabelText(/films gagnants/i), '3');

    await waitFor(() => expect(seenWinnerCount).toBe(3), { timeout: 3000 });
  });

  it('refuse de descendre sous le nombre de films déjà tirés', async () => {
    const user = userEvent.setup();
    let patchCalled = false;
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async () => {
        patchCalled = true;
        return HttpResponse.json({ ...baseEvent.config });
      })
    );

    renderWithRouter(
      <HostEventSettingsPanel
        slug={slug}
        hostToken={null}
        event={{
          ...baseEvent,
          winners: [
            { movieId: 'm1', pickMethod: 'wheel', pickedAt: '2030-01-01T20:00:00Z' },
            { movieId: 'm2', pickMethod: 'wheel', pickedAt: '2030-01-01T20:10:00Z' },
          ],
          config: { ...baseEvent.config!, winnerCount: 3, drawnWinnerCount: 2 },
        }}
        open
        onClose={() => {}}
      />,
      createTestQueryClient()
    );

    await user.clear(screen.getByLabelText(/films gagnants/i));
    await user.type(screen.getByLabelText(/films gagnants/i), '1');

    expect(
      await screen.findByText(/déjà 2 films gagnants/i, {}, { timeout: 3000 })
    ).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });

  describe('zone de danger (suppression)', () => {
    const myPid = 'p-self';

    function eventAsConnectedCreator(): EventData {
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
      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken="ht-only"
          event={baseEvent}
          open
          onClose={() => {}}
        />
      );
      expect(screen.queryByTestId('host-danger-zone')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-event-button')).not.toBeInTheDocument();
    });

    it('montre la zone de danger pour le créateur connecté', async () => {
      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken={null}
          event={eventAsConnectedCreator()}
          open
          onClose={() => {}}
        />
      );
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

      setStoredParticipant(slug, myPid, 'Hôte');
      setStoredHostToken(slug, 'ht-1');

      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken="ht-1"
          event={eventAsConnectedCreator()}
          open
          onClose={() => {}}
        />
      );

      await user.click(screen.getByTestId('delete-event-button'));
      await user.click(await screen.findByTestId('delete-event-confirm-dialog-confirm'));

      await waitFor(() => expect(deleteCalled).toBe(true));
      expect(calledUrl).toContain(`/events/${slug}`);
      expect(calledUrl).not.toContain('/participants/');

      await waitFor(() => expect(getStoredParticipant(slug)).toBeNull());
      expect(getStoredHostToken(slug)).toBeNull();

      expect(await screen.findByTestId('route-my-events')).toBeInTheDocument();
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
        <HostEventSettingsPanel
          slug={slug}
          hostToken={null}
          event={eventAsConnectedCreator()}
          open
          onClose={() => {}}
        />
      );
      await user.click(screen.getByTestId('delete-event-button'));
      await user.click(await screen.findByTestId('delete-event-confirm-dialog-cancel'));

      await new Promise((r) => setTimeout(r, 30));
      expect(deleteCalled).toBe(false);
    });

    it('API renvoie 403 → message d\u2019erreur affiché, pas de redirection', async () => {
      const user = userEvent.setup();
      server.use(
        http.delete(`${TEST_API_V1}/events/${slug}`, () =>
          HttpResponse.json(
            { error: 'Seul le créateur peut supprimer la soirée.', code: 403 },
            { status: 403 }
          )
        )
      );

      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken={null}
          event={eventAsConnectedCreator()}
          open
          onClose={() => {}}
        />
      );
      await user.click(screen.getByTestId('delete-event-button'));
      await user.click(await screen.findByTestId('delete-event-confirm-dialog-confirm'));

      expect(await screen.findByRole('alert')).toHaveTextContent(/seul le créateur/i);
      expect(screen.queryByTestId('route-my-events')).not.toBeInTheDocument();
    });
  });

  const creatorEvent: EventData = {
    ...baseEvent,
    myParticipant: { id: 'p1', pseudo: 'Hôte' },
    participants: [{ id: 'p1', pseudo: 'Hôte', isCreator: true }],
  };

  const templateFixture = {
    id: 'tpl1',
    name: 'Soirée horreur',
    theme: '🎃 Halloween',
    maxProposalsPerParticipant: 4,
    maxParticipants: 12,
    wheelMode: 'weightedByVotes',
    richSharePreview: false,
    allowSeries: true,
    winnerCount: 1,
  };

  it('applique aussi le nombre de gagnants du template', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/users/me/event-templates`, () =>
        HttpResponse.json({ items: [{ ...templateFixture, winnerCount: 3 }] })
      ),
      http.patch(`${TEST_API_V1}/events/${slug}/config`, () => HttpResponse.json({}))
    );

    renderWithRouter(
      <HostEventSettingsPanel
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={creatorEvent}
      />
    );

    await user.click(await screen.findByRole('button', { name: /Soirée horreur/ }));

    await waitFor(() => expect(document.getElementById('host-cfg-winner-count')).toHaveValue(3));
  });

  it('applique un template aux réglages de la soirée', async () => {
    const user = userEvent.setup();
    let patchedBody: Record<string, unknown> | null = null;
    server.use(
      http.get(`${TEST_API_V1}/users/me/event-templates`, () =>
        HttpResponse.json({ items: [{ ...templateFixture, richSharePreview: true }] })
      ),
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        patchedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          theme: '🎃 Halloween',
          maxProposalsPerParticipant: 4,
          maxParticipants: 12,
          wheelMode: 'weightedByVotes',
          richSharePreview: false,
          allowSeries: true,
        });
      })
    );

    renderWithRouter(
      <HostEventSettingsPanel
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={creatorEvent}
      />
    );

    await user.click(await screen.findByRole('button', { name: /Soirée horreur/ }));

    await waitFor(() => expect(patchedBody).not.toBeNull());
    expect(patchedBody).toMatchObject({
      theme: '🎃 Halloween',
      maxProposalsPerParticipant: 4,
      maxParticipants: 12,
      wheelMode: 'weightedByVotes',
      richSharePreview: true,
      allowSeries: true,
    });
  });

  it('permet de gérer les templates depuis le panneau', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${TEST_API_V1}/users/me/event-templates`, () =>
        HttpResponse.json({ items: [templateFixture] })
      )
    );

    renderWithRouter(
      <HostEventSettingsPanel
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={creatorEvent}
      />
    );

    await user.click(await screen.findByRole('button', { name: 'Gérer' }));

    expect(
      screen.getByRole('button', { name: /Renommer le template « Soirée horreur »/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Supprimer le template « Soirée horreur »/ })
    ).toBeInTheDocument();
  });

  it('met à jour le template appliqué après une retouche des réglages', async () => {
    const user = userEvent.setup();
    let putBody: Record<string, unknown> | null = null;
    server.use(
      http.get(`${TEST_API_V1}/users/me/event-templates`, () =>
        HttpResponse.json({ items: [templateFixture] })
      ),
      http.patch(`${TEST_API_V1}/events/${slug}/config`, () =>
        HttpResponse.json({
          theme: '🎃 Halloween',
          maxProposalsPerParticipant: 4,
          maxParticipants: 12,
          wheelMode: 'weightedByVotes',
          richSharePreview: false,
          allowSeries: true,
        })
      ),
      http.put(`${TEST_API_V1}/users/me/event-templates/tpl1`, async ({ request }) => {
        putBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...templateFixture, wheelMode: 'strictRandom' });
      })
    );

    renderWithRouter(
      <HostEventSettingsPanel
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={creatorEvent}
      />
    );

    await user.click(await screen.findByRole('button', { name: /Soirée horreur/ }));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /pondéré par les votes/i })).toBeChecked()
    );

    await user.click(screen.getByRole('radio', { name: /aléatoire strict/i }));

    const updateButton = await screen.findByRole('button', { name: 'Mettre à jour' });
    await user.click(updateButton);

    await waitFor(() => expect(putBody).not.toBeNull());
    expect(putBody).toMatchObject({
      name: 'Soirée horreur',
      theme: '🎃 Halloween',
      wheelMode: 'strictRandom',
      richSharePreview: false,
      allowSeries: true,
    });
  });

  it('garde le template appliqué coché quand il n’a aucune limite', async () => {
    const user = userEvent.setup();
    const noLimitTemplate = {
      ...templateFixture,
      maxProposalsPerParticipant: null,
      maxParticipants: null,
    };
    server.use(
      http.get(`${TEST_API_V1}/users/me/event-templates`, () =>
        HttpResponse.json({ items: [noLimitTemplate] })
      ),
      http.patch(`${TEST_API_V1}/events/${slug}/config`, () =>
        HttpResponse.json({
          theme: '🎃 Halloween',
          maxProposalsPerParticipant: null,
          maxParticipants: null,
          wheelMode: 'weightedByVotes',
          richSharePreview: false,
          allowSeries: true,
        })
      )
    );

    renderWithRouter(
      <HostEventSettingsPanel
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={creatorEvent}
      />
    );

    const chip = await screen.findByRole('button', { name: /Soirée horreur/ });
    await user.click(chip);

    await waitFor(() => expect(chip).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.queryByRole('button', { name: 'Mettre à jour' })).not.toBeInTheDocument();
  });

  it('regroupe la gestion des templates en bas du panneau', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/me/event-templates`, () =>
        HttpResponse.json({ items: [templateFixture] })
      )
    );

    renderWithRouter(
      <HostEventSettingsPanel
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={creatorEvent}
      />
    );

    const chip = await screen.findByRole('button', { name: /Soirée horreur/ });
    const section = screen.getByTestId('event-templates-section');

    expect(section).toContainElement(chip);
    expect(section).toContainElement(screen.getByRole('button', { name: 'En faire un template' }));

    const lastSetting = screen.getByRole('radio', { name: /aléatoire strict/i });
    expect(
      lastSetting.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  describe('répétition de la soirée', () => {
    function recurringEvent(config: Partial<EventData['config']> = {}): EventData {
      return { ...baseEvent, config: { ...baseEvent.config!, ...config } };
    }

    function capturePatchBody() {
      const bodies: Record<string, unknown>[] = [];
      server.use(
        http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
          bodies.push((await request.json()) as Record<string, unknown>);
          return HttpResponse.json({});
        })
      );
      return bodies;
    }

    it('activer la répétition envoie une récurrence hebdomadaire', async () => {
      const user = userEvent.setup();
      const bodies = capturePatchBody();

      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken="ht-1"
          event={recurringEvent()}
          open
          onClose={() => {}}
        />
      );

      await user.click(screen.getByRole('switch', { name: /répéter cette soirée/i }));

      await waitFor(() => expect(bodies).toHaveLength(1));
      expect(bodies[0]!.recurrence).toBe('weekly');
      expect(bodies[0]!.clearRecurrence).toBeUndefined();
    });

    it('choisir un autre rythme envoie la fréquence correspondante', async () => {
      const user = userEvent.setup();
      const bodies = capturePatchBody();

      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken="ht-1"
          event={recurringEvent({ recurrence: 'weekly' })}
          open
          onClose={() => {}}
        />
      );

      expect(screen.getByText(/les participants ne sont pas réinscrits/i)).toBeInTheDocument();

      await user.click(screen.getByRole('radio', { name: 'Mois' }));

      await waitFor(() => expect(bodies).toHaveLength(1));
      expect(bodies[0]!.recurrence).toBe('monthly');
    });

    it('couper la répétition demande explicitement son retrait', async () => {
      const user = userEvent.setup();
      const bodies = capturePatchBody();

      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken="ht-1"
          event={recurringEvent({ recurrence: 'biweekly' })}
          open
          onClose={() => {}}
        />
      );

      await user.click(screen.getByRole('switch', { name: /répéter cette soirée/i }));

      await waitFor(() => expect(bodies).toHaveLength(1));
      expect(bodies[0]!.clearRecurrence).toBe(true);
      expect(bodies[0]!.recurrence).toBeUndefined();
    });

    it('un réglage sans rapport laisse la récurrence hors du PATCH', async () => {
      const user = userEvent.setup();
      const bodies = capturePatchBody();

      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken="ht-1"
          event={recurringEvent({ recurrence: 'weekly' })}
          open
          onClose={() => {}}
        />
      );

      await user.click(screen.getByRole('switch', { name: /autoriser les séries tv/i }));

      await waitFor(() => expect(bodies).toHaveLength(1));
      expect(bodies[0]!.recurrence).toBeUndefined();
      expect(bodies[0]!.clearRecurrence).toBeUndefined();
    });

    it('occurrence suivante déjà créée : le réglage est verrouillé et expliqué', async () => {
      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken="ht-1"
          event={recurringEvent({ recurrence: 'weekly', hasNextOccurrence: true })}
          open
          onClose={() => {}}
        />
      );

      expect(screen.getByRole('switch', { name: /répéter cette soirée/i })).toBeDisabled();
      expect(screen.queryByRole('radio', { name: 'Mois' })).not.toBeInTheDocument();
      expect(screen.getByText(/la prochaine soirée est déjà créée/i)).toBeInTheDocument();
    });
  });
});
