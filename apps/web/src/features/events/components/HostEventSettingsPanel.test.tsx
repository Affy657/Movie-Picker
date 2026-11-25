import { useState, type ReactNode } from 'react';
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { TEST_API_V1, authMeGuestHandler } from '@/mocks/handlers';
import { apiErrorJson } from '@/mocks/apiJson';
import { queryKeys } from '@/shared/hooks/queryKeys';
import HostEventSettingsPanel from '@/features/events/components/HostEventSettingsPanel';
import titleBarStyles from '@/shared/components/DialogTitleBar.module.css';
import modalStyles from '@/shared/components/Modal.module.css';
import { stubMatchMedia } from '@/test-utils/matchMedia';
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

function whenTrigger() {
  return screen.getByRole('button', { name: /^date et heure/i });
}

async function pickDay(user: ReturnType<typeof userEvent.setup>, day: string) {
  if (whenTrigger().getAttribute('aria-expanded') !== 'true') await user.click(whenTrigger());
  const panel = screen.getByRole('group', { name: 'Date et heure' });
  if (!within(panel).queryByRole('button', { name: day })) {
    await user.click(within(panel).getByRole('button', { name: 'Mois suivant' }));
  }
  await user.click(within(panel).getByRole('button', { name: day }));
}

async function pickTime(user: ReturnType<typeof userEvent.setup>, time: string) {
  if (whenTrigger().getAttribute('aria-expanded') !== 'true') await user.click(whenTrigger());
  const panel = screen.getByRole('group', { name: 'Date et heure' });
  await user.click(within(panel).getByRole('button', { name: time }));
}

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

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2029-12-01T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    server.resetHandlers();
  });
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

    expect(screen.getByLabelText('Nom')).toBeDisabled();
    expect(screen.getByRole('button', { name: /^date et heure/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Selon les votes' })).toBeDisabled();
    expect(screen.getByLabelText('Films par personne')).toBeDisabled();
    expect(screen.getByLabelText('Participants')).toBeDisabled();
    expect(screen.getByLabelText(/films gagnants/i)).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'Répéter' })).toBeEnabled();
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

    await user.click(screen.getByRole('radio', { name: 'Selon les votes' }));

    await waitFor(() => expect(patched).toBe(true));
  });

  it('saves a setting switched back before the movie night is reloaded', async () => {
    const user = userEvent.setup();
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
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
      />
    );
    const allowSeries = screen.getByRole('switch', { name: 'Séries TV' });

    await user.click(allowSeries);
    await waitFor(() => expect(bodies).toHaveLength(1));
    await user.click(allowSeries);

    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies).toEqual([{ allowSeries: true }, { allowSeries: false }]);
  });

  it('sends nothing when a change is undone before it is saved', async () => {
    const user = userEvent.setup();
    let patchCalled = false;
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, () => {
        patchCalled = true;
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
      />
    );
    const title = screen.getByLabelText('Nom');

    await user.type(title, 'x{Backspace}');
    await new Promise((resolve) => setTimeout(resolve, 800));

    expect(patchCalled).toBe(false);
    expect(screen.getByText('Enregistré')).toBeInTheDocument();
  });

  it('holds a change until the save in flight is done, then sends it', async () => {
    const user = userEvent.setup();
    const bodies: Record<string, unknown>[] = [];
    let releaseFirstSave: () => void = () => {};
    const firstSaveHeld = new Promise<void>((resolve) => {
      releaseFirstSave = resolve;
    });
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        if (bodies.length === 1) await firstSaveHeld;
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
      />
    );
    const allowSeries = screen.getByRole('switch', { name: 'Séries TV' });

    await user.click(allowSeries);
    await waitFor(() => expect(bodies).toHaveLength(1));
    await user.click(allowSeries);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(bodies).toHaveLength(1);
    expect(screen.getByText('Enregistrement…')).toBeInTheDocument();

    releaseFirstSave();

    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).toEqual({ allowSeries: false });
    expect(await screen.findByText('Enregistré')).toBeInTheDocument();
  });

  it('marks my movie nights stale once a new title is saved', async () => {
    const user = userEvent.setup();
    let patchedBody: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        patchedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...baseEvent.config });
      })
    );
    const qc = createTestQueryClient();
    qc.setQueryData(queryKeys.myEvents.active, { pages: [], pageParams: [] });

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

    await user.type(screen.getByLabelText('Nom'), ' ciné');

    await waitFor(() => expect(patchedBody).toEqual({ title: 'Test ciné' }), { timeout: 3000 });
    await waitFor(() =>
      expect(qc.getQueryState(queryKeys.myEvents.active)?.isInvalidated).toBe(true)
    );
  });

  it('stepping the participants limit down from unlimited sends the default cap, then the typed one', async () => {
    const user = userEvent.setup();
    const seen: unknown[] = [];
    server.use(
      http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        seen.push(body.maxParticipants);
        return HttpResponse.json({ ...baseEvent.config, maxParticipants: 8 });
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

    const field = screen.getByLabelText('Participants');
    expect(field).toHaveAttribute('placeholder', 'Sans limite');
    await user.click(within(field.closest('div')!).getByRole('button', { name: 'Diminuer' }));
    await waitFor(() => expect(seen).toEqual([10]), { timeout: 3000 });

    fireEvent.change(field, { target: { value: '8' } });

    await waitFor(() => expect(seen.at(-1)).toBe(8), { timeout: 3000 });
  });

  it('emptying the participants limit sends 0 and shows it as unlimited', async () => {
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

    const field = screen.getByLabelText('Participants');
    expect(field).toHaveValue(8);
    fireEvent.change(field, { target: { value: '' } });

    await waitFor(() => expect(seenMax).toBe(0));
    expect(field).toHaveValue(null);
  });

  it('shows a limit stored at the cap as a limit, with its value', () => {
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

    expect(screen.getByLabelText('Participants')).toHaveValue(300);
    expect(screen.getByLabelText('Films par personne')).toHaveValue(15);
  });

  it('stepping the vote limit down from unlimited sends the default value, then the typed value', async () => {
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

    const field = screen.getByLabelText('Votes par personne');
    expect(field).toHaveValue(null);
    await user.click(within(field.closest('div')!).getByRole('button', { name: 'Diminuer' }));

    await waitFor(() => expect(seen).toEqual([3]), { timeout: 3000 });
    expect(field).toHaveValue(3);

    fireEvent.change(field, { target: { value: '5' } });

    await waitFor(() => expect(seen.at(-1)).toBe(5), { timeout: 3000 });
  });

  it('emptying the vote limit sends 0', async () => {
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

    const field = screen.getByLabelText('Votes par personne');
    expect(field).toHaveValue(4);
    fireEvent.change(field, { target: { value: '' } });

    await waitFor(() => expect(seenMaxVotes).toBe(0), { timeout: 3000 });
  });

  it('refuse une limite de votes en dessous de 1 sans appeler l’API', async () => {
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

    fireEvent.change(screen.getByLabelText('Votes par personne'), { target: { value: '0' } });

    expect(
      await screen.findByText(/votes par participant : nombre entier à partir de 1/i)
    ).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(patchCalled).toBe(false);
  });

  it('rejects a capacity below the number of participants already in', async () => {
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

    fireEvent.change(screen.getByLabelText('Participants'), { target: { value: '3' } });

    expect(
      await screen.findByText(/Impossible de réduire la capacité/i, {}, { timeout: 3000 })
    ).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });

  it('shows a refused rule on the rules row of a phone and opens the rules again', async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    server.use(http.patch(`${TEST_API_V1}/events/${slug}/config`, () => HttpResponse.json({})));

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

    await user.click(screen.getByRole('button', { name: /^règles/i }));
    const rules = screen.getByRole('dialog', { name: 'Règles' });
    fireEvent.change(within(rules).getByLabelText('Participants'), { target: { value: '3' } });
    await user.click(within(rules).getByRole('button', { name: 'Terminé' }));

    expect(screen.queryByRole('dialog', { name: 'Règles' })).not.toBeInTheDocument();
    expect(
      await screen.findByRole('dialog', { name: 'Règles' }, { timeout: 3000 })
    ).toHaveTextContent(/Impossible de réduire la capacité/i);
    expect(screen.getByRole('button', { name: /^règles/i })).toHaveAccessibleDescription(
      /Impossible de réduire la capacité/i
    );
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

  it('sends the date, the time and the notify choice once the host leaves the date', async () => {
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

    expect(whenTrigger()).toHaveTextContent('Mardi 1 janvier 2030, 20:00');
    await pickDay(user, 'vendredi 1 février 2030');
    await pickTime(user, '21:30');
    await user.click(screen.getByLabelText('Nom'));

    await waitFor(() => expect(body).not.toBeNull(), { timeout: 3000 });
    expect(body).toEqual({
      date: '2030-02-01',
      time: '21:30',
      notifyParticipantsOfDateChange: true,
    });
  });

  describe('dates the night cannot take', () => {
    function renderPanel() {
      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken={null}
          event={baseEvent}
          open
          onClose={() => {}}
        />
      );
    }

    it('keeps the days that would end the night at once out of reach', async () => {
      const user = userEvent.setup();
      renderPanel();

      await user.click(whenTrigger());
      const panel = screen.getByRole('group', { name: 'Date et heure' });
      await user.click(within(panel).getByRole('button', { name: 'Mois précédent' }));
      await user.click(within(panel).getByRole('button', { name: 'Mois précédent' }));

      expect(within(panel).getByRole('button', { name: 'Mois précédent' })).toBeDisabled();
      expect(
        within(panel).getByRole('button', { name: 'vendredi 23 novembre 2029' })
      ).toBeDisabled();
      expect(within(panel).getByRole('button', { name: 'samedi 24 novembre 2029' })).toBeEnabled();
    });

    it('shows the refusal of the API under the date field', async () => {
      const user = userEvent.setup();
      server.use(
        http.patch(`${TEST_API_V1}/events/${slug}/config`, () =>
          apiErrorJson(400, 'event_date_too_early')
        )
      );
      renderPanel();

      await pickDay(user, 'vendredi 1 février 2030');
      await pickTime(user, '21:30');
      await user.click(screen.getByLabelText('Nom'));

      expect(
        await screen.findByText(
          'Cette date est trop ancienne : la soirée serait aussitôt terminée.',
          {},
          { timeout: 3000 }
        )
      ).toBeInTheDocument();
      expect(whenTrigger()).toHaveAccessibleDescription(/trop ancienne/);
      expect(screen.getByText('Non enregistré')).toBeInTheDocument();
    });
  });

  describe('rescheduling', () => {
    function capturePatchBodies() {
      const bodies: Record<string, unknown>[] = [];
      server.use(
        http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
          bodies.push((await request.json()) as Record<string, unknown>);
          return HttpResponse.json({ ...baseEvent.config });
        })
      );
      return bodies;
    }

    function renderPanel() {
      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken={null}
          event={baseEvent}
          open
          onClose={() => {}}
        />
      );
    }

    const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    it('sends a single new date, so a single notification, however long the host pauses while picking it', async () => {
      const user = userEvent.setup();
      const bodies = capturePatchBodies();
      renderPanel();

      await pickDay(user, 'vendredi 1 février 2030');
      await pause(800);
      await pickDay(user, 'samedi 2 février 2030');
      await pause(800);

      expect(bodies).toEqual([]);

      await pickTime(user, '21:30');
      await user.click(screen.getByLabelText('Nom'));

      await waitFor(() => expect(bodies).toHaveLength(1), { timeout: 3000 });
      expect(bodies[0]).toEqual({
        date: '2030-02-02',
        time: '21:30',
        notifyParticipantsOfDateChange: true,
      });
    });

    it('lets the host keep the participants out of the loop once the date is picked', async () => {
      const user = userEvent.setup();
      const bodies = capturePatchBodies();
      renderPanel();

      await pickDay(user, 'vendredi 1 février 2030');
      await pickTime(user, '21:30');
      await pause(800);

      expect(bodies).toEqual([]);
      expect(screen.getByText('Enregistrement…')).toBeInTheDocument();
      await user.click(screen.getByRole('switch', { name: 'Prévenir les participants' }));
      await user.click(screen.getByLabelText('Nom'));

      await waitFor(() => expect(bodies).toHaveLength(1), { timeout: 3000 });
      expect(bodies[0]).toEqual({
        date: '2030-02-01',
        time: '21:30',
        notifyParticipantsOfDateChange: false,
      });
      expect(await screen.findByText('Enregistré')).toBeInTheDocument();
    });

    it('lets the host keep the participants out of the loop on a phone too', async () => {
      stubMatchMedia(true);
      const user = userEvent.setup();
      const bodies = capturePatchBodies();
      renderWithRouter(<ClosablePanel />);

      await user.click(whenTrigger());
      const sheet = screen.getByRole('dialog', { name: 'Date et heure' });
      await user.click(within(sheet).getByRole('button', { name: 'vendredi 4 janvier 2030' }));
      await user.click(within(sheet).getByRole('button', { name: 'Valider' }));
      await pause(800);

      expect(bodies).toEqual([]);
      await user.click(screen.getByRole('switch', { name: 'Prévenir les participants' }));
      fireEvent.click(
        within(screen.getByRole('dialog', { name: 'Paramètres de la soirée' })).getByRole(
          'button',
          { name: 'Fermer' }
        )
      );

      await waitFor(() => expect(bodies).toHaveLength(1), { timeout: 3000 });
      expect(bodies[0]).toEqual({
        date: '2030-01-04',
        time: '20:00',
        notifyParticipantsOfDateChange: false,
      });
    });

    function ClosablePanel() {
      const [open, setOpen] = useState(true);
      return (
        <HostEventSettingsPanel
          slug={slug}
          hostToken={null}
          event={baseEvent}
          open={open}
          onClose={() => setOpen(false)}
        />
      );
    }

    function ReopenablePanel() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Rouvrir
          </button>
          <HostEventSettingsPanel
            slug={slug}
            hostToken={null}
            event={baseEvent}
            open={open}
            onClose={() => setOpen(false)}
          />
        </>
      );
    }

    it('takes today from the moment the window opens again', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ReopenablePanel />);

      fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
      vi.setSystemTime(new Date('2029-12-04T12:00:00Z'));
      await user.click(screen.getByRole('button', { name: 'Rouvrir' }));
      await user.click(whenTrigger());
      const panel = screen.getByRole('group', { name: 'Date et heure' });
      await user.click(within(panel).getByRole('button', { name: 'Mois précédent' }));

      expect(within(panel).getByRole('button', { name: 'mardi 4 décembre 2029' })).toHaveAttribute(
        'aria-current',
        'date'
      );
    });

    it('saves a date still being picked when the window closes', async () => {
      const user = userEvent.setup();
      const bodies = capturePatchBodies();
      renderWithRouter(<ClosablePanel />);

      await pickDay(user, 'vendredi 1 février 2030');
      fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));

      await waitFor(() => expect(bodies).toHaveLength(1), { timeout: 3000 });
      expect(bodies[0]).toEqual({
        date: '2030-02-01',
        time: '20:00',
        notifyParticipantsOfDateChange: true,
      });
    });

    it('leaves a date still being picked out of the save of another field', async () => {
      const user = userEvent.setup();
      const bodies = capturePatchBodies();
      renderPanel();

      await user.type(screen.getByLabelText('Nom'), ' ciné');
      await pickDay(user, 'vendredi 1 février 2030');

      await waitFor(() => expect(bodies).toHaveLength(1), { timeout: 3000 });
      expect(bodies[0]).toEqual({ title: 'Test ciné' });
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

  it('refuses to save a template with a cleared limit instead of saving the default', async () => {
    const user = userEvent.setup();
    let templateWrites = 0;
    server.use(
      http.get(`${TEST_API_V1}/users/me/event-templates`, () => HttpResponse.json({ items: [] })),
      http.post(`${TEST_API_V1}/users/me/event-templates`, () => {
        templateWrites += 1;
        return HttpResponse.json({ ...templateFixture, id: 'tpl2' });
      }),
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

    fireEvent.change(screen.getByLabelText('Votes par personne'), { target: { value: '0' } });
    await user.click(await screen.findByRole('button', { name: /enregistrer comme modèle/i }));

    expect(
      await screen.findByText('Votes par participant : nombre entier à partir de 1.')
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Nom du modèle')).toBeNull();
    expect(templateWrites).toBe(0);
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
      screen.getByRole('button', { name: /Renommer le modèle « Soirée horreur »/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Supprimer le modèle « Soirée horreur »/ })
    ).toBeInTheDocument();
  });

  it('renaming a template that is not applied does not offer to overwrite it', async () => {
    const user = userEvent.setup();
    let templates = [templateFixture];
    let putBody: Record<string, unknown> | null = null;
    server.use(
      http.get(`${TEST_API_V1}/users/me/event-templates`, () =>
        HttpResponse.json({ items: templates })
      ),
      http.put(`${TEST_API_V1}/users/me/event-templates/tpl1`, async ({ request }) => {
        putBody = (await request.json()) as Record<string, unknown>;
        templates = [{ ...templateFixture, name: 'Soirée frissons' }];
        return HttpResponse.json(templates[0]);
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

    await user.click(await screen.findByRole('button', { name: 'Gérer' }));
    await user.click(screen.getByRole('button', { name: /Renommer le modèle « Soirée horreur »/ }));
    const nameField = screen.getByRole('textbox', { name: /Nom du modèle/ });
    await user.clear(nameField);
    await user.type(nameField, 'Soirée frissons');
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    await waitFor(() => expect(putBody).toMatchObject({ name: 'Soirée frissons' }));
    expect(await screen.findByText('Soirée frissons')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mettre à jour' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Vous avez modifié la configuration/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer comme modèle' })).toBeInTheDocument();
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
      expect(screen.getByRole('radio', { name: 'Selon les votes' })).toBeChecked()
    );

    await user.click(screen.getByRole('radio', { name: 'Au hasard' }));

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

    const chip = await screen.findByRole('button', { name: /Soirée horreur/ });
    expect(chip).toBeDisabled();
    expect(screen.getByText(/les modèles ne s’appliquent plus/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gérer' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Enregistrer comme modèle' })).toBeEnabled();

    await user.click(chip);
    expect(patched).toBe(false);
  });

  it('puts the templates at the top of the rules, before the first rule', async () => {
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
    const rules = screen.getByRole('region', { name: 'Règles' });

    expect(rules).toContainElement(chip);
    expect(rules).toContainElement(
      screen.getByRole('button', { name: 'Enregistrer comme modèle' })
    );
    expect(
      chip.compareDocumentPosition(screen.getByLabelText('Participants')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  describe('group of the night', () => {
    const thursdayGroup = {
      id: 'g1',
      name: 'Les jeudis ciné',
      role: 'member' as const,
      ownerId: 'u2',
      ownerDisplayName: 'Léa',
      memberCount: 6,
      memberPreview: [],
      createdAt: '2026-11-01T10:00:00Z',
      updatedAt: '2026-11-01T10:00:00Z',
    };

    function groupEvent(groupId: string | null): EventData {
      return { ...creatorEvent, config: { ...creatorEvent.config!, groupId } };
    }

    function serveGroupsAndCapturePatch() {
      const bodies: Record<string, unknown>[] = [];
      server.use(
        http.get(`${TEST_API_V1}/groups`, () =>
          HttpResponse.json({ groups: [thursdayGroup], invitations: [], nextNights: [] })
        ),
        http.get(`${TEST_API_V1}/users/me/event-templates`, () => HttpResponse.json({ items: [] })),
        http.patch(`${TEST_API_V1}/events/${slug}/config`, async ({ request }) => {
          bodies.push((await request.json()) as Record<string, unknown>);
          return HttpResponse.json({});
        })
      );
      return bodies;
    }

    it('puts the night in one of the host groups', async () => {
      const user = userEvent.setup();
      const bodies = serveGroupsAndCapturePatch();

      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken="ht-1"
          event={groupEvent(null)}
          open
          onClose={() => {}}
        />
      );

      await user.click(await screen.findByRole('button', { name: 'Les jeudis ciné' }));

      await waitFor(() => expect(bodies).toHaveLength(1));
      expect(bodies[0]!.groupId).toBe('g1');
    });

    it('takes the night out of its group', async () => {
      const user = userEvent.setup();
      const bodies = serveGroupsAndCapturePatch();

      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken="ht-1"
          event={groupEvent('g1')}
          open
          onClose={() => {}}
        />
      );

      expect(
        await screen.findByRole('button', { name: 'Les jeudis ciné', pressed: true })
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Aucun' }));

      await waitFor(() => expect(bodies).toHaveLength(1));
      expect(bodies[0]!.clearGroup).toBe(true);
      expect(bodies[0]!.groupId).toBeUndefined();
    });

    it('shows no group for a night left in a group the host no longer belongs to', async () => {
      serveGroupsAndCapturePatch();

      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken="ht-1"
          event={groupEvent('gone')}
          open
          onClose={() => {}}
        />
      );

      expect(
        await screen.findByRole('button', { name: 'Aucun', pressed: true })
      ).toBeInTheDocument();
    });

    it('shows no group choice to a host without group', async () => {
      server.use(
        http.get(`${TEST_API_V1}/groups`, () =>
          HttpResponse.json({ groups: [], invitations: [], nextNights: [] })
        ),
        http.get(`${TEST_API_V1}/users/me/event-templates`, () => HttpResponse.json({ items: [] }))
      );

      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken="ht-1"
          event={groupEvent(null)}
          open
          onClose={() => {}}
        />
      );

      await screen.findByRole('switch', { name: 'Répéter' });
      expect(screen.queryByRole('button', { name: 'Aucun' })).not.toBeInTheDocument();
    });
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

      await user.click(screen.getByRole('switch', { name: 'Répéter' }));

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

      expect(screen.getByRole('radio', { name: 'Semaine' })).toBeChecked();

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

      await user.click(screen.getByRole('switch', { name: 'Répéter' }));

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

      await user.click(screen.getByRole('switch', { name: 'Séries TV' }));

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

      expect(screen.getByRole('switch', { name: 'Répéter' })).toBeDisabled();
      expect(screen.queryByRole('radio', { name: 'Mois' })).not.toBeInTheDocument();
      expect(screen.getByText(/la prochaine soirée est déjà créée/i)).toBeInTheDocument();
    });
  });

  describe('dialog frame', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    function renderOpenPanel(onClose: () => void = () => {}) {
      renderWithRouter(
        <HostEventSettingsPanel
          slug={slug}
          hostToken={null}
          event={baseEvent}
          open
          onClose={onClose}
        />
      );
    }

    function dragDown(target: HTMLElement) {
      const now = vi.spyOn(performance, 'now').mockReturnValue(1_000);
      fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientY: 80 });
      now.mockReturnValue(1_400);
      fireEvent.pointerMove(window, { pointerId: 1, clientY: 400 });
      fireEvent.pointerUp(window, { pointerId: 1, clientY: 400 });
    }

    function stubPhoneWithoutMotion() {
      stubMatchMedia(
        (query) => query.includes('max-width') || query.includes('prefers-reduced-motion')
      );
    }

    it('titles the panel with the shared title bar, the save status as its detail', () => {
      renderOpenPanel();

      const heading = screen.getByRole('heading', { level: 2, name: 'Paramètres de la soirée' });
      expect(heading).toHaveClass(titleBarStyles.title!);
      expect(heading.parentElement).toHaveTextContent(/enregistr/i);
      expect(screen.getByRole('dialog', { name: 'Paramètres de la soirée' })).toBeInTheDocument();
    });

    it('scrolls every setting inside the padded body of the dialog', () => {
      renderOpenPanel();

      const body = screen.getByLabelText('Nom').closest(`.${modalStyles.body}`);
      expect(body).not.toBeNull();
      expect(body).toContainElement(screen.getByRole('switch', { name: 'Répéter' }));
    });

    it('closes when its title bar is dragged down on a phone', () => {
      stubPhoneWithoutMotion();
      const onClose = vi.fn();
      renderOpenPanel(onClose);

      dragDown(screen.getByRole('heading', { level: 2, name: 'Paramètres de la soirée' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('stays open when a drag starts on the settings themselves', () => {
      stubPhoneWithoutMotion();
      const onClose = vi.fn();
      renderOpenPanel(onClose);

      dragDown(screen.getByText('Ambiance'));

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
