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
} from '@/shared/utils/eventIdentityStorage';

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
  },
};

describe('HostEventSettingsPanel', () => {
  const server = setupServer(authMeGuestHandler);

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('stays open once a movie is drawn and only leaves the number of winners adjustable', () => {
    renderWithRouter(
      <HostEventSettingsPanel
        slug={slug}
        hostToken={null}
        event={{
          ...baseEvent,
          winners: [{ movieId: 'm1', pickMethod: 'wheel', pickedAt: '2030-01-01T20:00:00Z' }],
          config: { ...baseEvent.config!, winnerCount: 3 },
        }}
        open
        onClose={() => {}}
      />
    );

    expect(screen.getByLabelText(/nom de la soir/i)).toBeDisabled();
    expect(screen.getByRole('radio', { name: /par les votes/i })).toBeDisabled();
    expect(screen.getByRole('switch', { name: /limiter les films proposés/i })).toBeDisabled();
    expect(
      screen.getByRole('switch', { name: /limiter le nombre de participants/i })
    ).toBeDisabled();
    expect(screen.getByLabelText(/films gagnants/i)).toBeEnabled();
    expect(screen.getByRole('switch', { name: /répéter cette soirée/i })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent(/tirage a commenc/i);
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

  it('enabling the participants limit sends the default cap, then the typed one', async () => {
    const user = userEvent.setup();
    const seen: unknown[] = [];
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        seen.push(body.maxParticipants);
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

    expect(screen.queryByLabelText(/participants max/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: /limiter le nombre de participants/i }));
    await waitFor(() => expect(seen).toEqual([10]));

    await user.clear(screen.getByLabelText(/participants max/i));
    await user.type(screen.getByLabelText(/participants max/i), '8');

    await waitFor(() => expect(seen.at(-1)).toBe(8), { timeout: 3000 });
  });

  it('turning the participants limit off sends 0 and hides the counter', async () => {
    const user = userEvent.setup();
    let seenMax: unknown = 'untouched';
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        seenMax = body.maxParticipants;
        return HttpResponse.json({ ...baseEvent.config, maxParticipants: null });
      })
    );

    renderWithRouter(
      <HostEventSettingsPanel
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={{ ...baseEvent, config: { ...baseEvent.config!, maxParticipants: 8 } }}
      />
    );

    expect(screen.getByLabelText(/participants max/i)).toHaveValue(8);
    await user.click(screen.getByRole('switch', { name: /limiter le nombre de participants/i }));

    await waitFor(() => expect(seenMax).toBe(0));
    expect(screen.queryByLabelText(/participants max/i)).not.toBeInTheDocument();
  });

  it('shows a limit stored at the cap as no limit', () => {
    renderWithRouter(
      <HostEventSettingsPanel
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={{
          ...baseEvent,
          config: { ...baseEvent.config!, maxParticipants: 300, maxProposalsPerParticipant: 15 },
        }}
      />
    );

    expect(
      screen.getByRole('switch', { name: /limiter le nombre de participants/i })
    ).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: /limiter les films proposés/i })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('enabling the vote limit sends the default value, then the typed value', async () => {
    const user = userEvent.setup();
    const seen: unknown[] = [];
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        seen.push(body.maxVotesPerParticipant);
        return HttpResponse.json({ ...baseEvent.config, maxVotesPerParticipant: 3 });
      })
    );

    renderWithRouter(
      <HostEventSettingsPanel
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={baseEvent}
      />
    );

    const toggle = screen.getByRole('switch', { name: /limiter les votes par participant/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByLabelText(/^votes par participant$/i)).not.toBeInTheDocument();

    await user.click(toggle);

    await waitFor(() => expect(seen).toEqual([3]), { timeout: 3000 });
    const field = screen.getByLabelText(/^votes par participant$/i);
    expect(field).toHaveValue(3);

    await user.clear(field);
    await user.type(field, '5');

    await waitFor(() => expect(seen.at(-1)).toBe(5), { timeout: 3000 });
  });

  it('disabling the vote limit sends 0', async () => {
    const user = userEvent.setup();
    let seenMaxVotes: unknown;
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        seenMaxVotes = body.maxVotesPerParticipant;
        return HttpResponse.json({ ...baseEvent.config, maxVotesPerParticipant: null });
      })
    );

    renderWithRouter(
      <HostEventSettingsPanel
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={{ ...baseEvent, config: { ...baseEvent.config!, maxVotesPerParticipant: 4 } }}
      />
    );

    const toggle = screen.getByRole('switch', { name: /limiter les votes par participant/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText(/^votes par participant$/i)).toHaveValue(4);

    await user.click(toggle);

    await waitFor(() => expect(seenMaxVotes).toBe(0), { timeout: 3000 });
    expect(screen.queryByLabelText(/^votes par participant$/i)).not.toBeInTheDocument();
  });

  it('refuse une limite de votes en dessous de 1 sans appeler l’API', async () => {
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
        event={{ ...baseEvent, config: { ...baseEvent.config!, maxVotesPerParticipant: 4 } }}
      />
    );

    const field = screen.getByLabelText(/^votes par participant$/i);
    await user.clear(field);
    await user.type(field, '0');

    expect(
      await screen.findByText(/votes par participant : nombre entier à partir de 1/i)
    ).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(patchCalled).toBe(false);
  });

  it('rejects a capacity below the number of participants already in', async () => {
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
        event={{
          ...baseEvent,
          participantCount: 5,
          config: { ...baseEvent.config!, maxParticipants: 8 },
        }}
      />
    );

    await user.clear(screen.getByLabelText(/participants max/i));
    await user.type(screen.getByLabelText(/participants max/i), '3');

    expect(
      await screen.findByText(/Impossible de réduire la capacité/i, {}, { timeout: 3000 })
    ).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });

  it('sends the number of movies to draw typed by the host', async () => {
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

  it('sends only the number of winners when it is the only field changed after a draw', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...baseEvent.config, winnerCount: 3 });
      })
    );

    renderWithRouter(
      <HostEventSettingsPanel
        slug={slug}
        hostToken={null}
        event={{
          ...baseEvent,
          winners: [{ movieId: 'm1', pickMethod: 'wheel', pickedAt: '2030-01-01T20:00:00Z' }],
          config: { ...baseEvent.config!, winnerCount: 2 },
        }}
        open
        onClose={() => {}}
      />,
      createTestQueryClient()
    );

    await user.clear(screen.getByLabelText(/films gagnants/i));
    await user.type(screen.getByLabelText(/films gagnants/i), '3');

    await waitFor(() => expect(body).not.toBeNull(), { timeout: 3000 });
    expect(body).toEqual({ winnerCount: 3 });
  });

  it("envoie la date, l'heure et le choix de notification seulement quand la date change", async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...baseEvent.config });
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

    const dateField = screen.getByLabelText(/date et heure/i);
    await user.clear(dateField);
    await user.type(dateField, '2030-02-01T21:30');

    await waitFor(() => expect(body).not.toBeNull(), { timeout: 3000 });
    expect(body).toEqual({
      date: '2030-02-01',
      time: '21:30',
      notifyParticipantsOfDateChange: true,
    });
  });

  it('refuses to go below the number of movies already drawn', async () => {
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
          config: { ...baseEvent.config!, winnerCount: 3 },
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

    it('does NOT show the danger zone when the user is not the signed-in creator', async () => {
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

    it('shows the danger zone for the signed-in creator', async () => {
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

    it('confirming the modal: DELETE called, local cleanup and redirect', async () => {
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

    it('cancelling the modal: no DELETE sent', async () => {
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

    it('API returns 403: error message shown, no redirect', async () => {
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

  it('applies a template to the movie night settings', async () => {
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

  it('allows managing the templates from the panel', async () => {
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

  it('updates the applied template after a settings tweak', async () => {
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

  it('keeps the applied template checked when it has no limit', async () => {
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

  it('once a movie is drawn, templates can still be managed but no longer applied', async () => {
    const user = userEvent.setup();
    let patched = false;
    server.use(
      http.get(`${TEST_API_V1}/users/me/event-templates`, () =>
        HttpResponse.json({ items: [templateFixture] })
      ),
      http.patch(`${TEST_API_V1}/events/${slug}/config`, () => {
        patched = true;
        return HttpResponse.json({ ...baseEvent.config });
      })
    );

    renderWithRouter(
      <HostEventSettingsPanel
        open
        onClose={() => {}}
        slug={slug}
        hostToken={null}
        event={{
          ...creatorEvent,
          winners: [{ movieId: 'm1', pickMethod: 'wheel', pickedAt: '2030-01-01T20:00:00Z' }],
          config: { ...creatorEvent.config!, winnerCount: 2 },
        }}
      />
    );

    const section = screen.getByTestId('event-templates-section');
    const chip = await screen.findByRole('button', { name: /Soirée horreur/ });
    expect(chip).toBeDisabled();
    expect(section).toHaveTextContent(/les templates ne s’appliquent plus/i);
    expect(screen.getByRole('button', { name: 'Gérer' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Enregistrer en template' })).toBeEnabled();

    await user.click(chip);
    expect(patched).toBe(false);
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
    expect(section).toContainElement(
      screen.getByRole('button', { name: 'Enregistrer en template' })
    );

    const lastSetting = screen.getByRole('radio', { name: /aléatoire strict/i });
    expect(
      lastSetting.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  describe('movie night repetition', () => {
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

    it('enabling the repetition sends a weekly recurrence', async () => {
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

    it('choosing another rhythm sends the matching frequency', async () => {
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

    it('turning the repetition off explicitly asks for its removal', async () => {
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

    it('an unrelated setting leaves the recurrence out of the PATCH', async () => {
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

    it('next occurrence already created: the setting is locked and explained', async () => {
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
