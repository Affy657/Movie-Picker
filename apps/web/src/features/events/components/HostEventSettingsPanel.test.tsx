import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import HostEventSettingsPanel from '@/features/events/components/HostEventSettingsPanel';
import type { EventData } from '@/features/events/types';

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
  const server = setupServer();

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
    render(
      <AppTestProviders client={qc}>
        <HostEventSettingsPanel slug={slug} hostToken={null} event={baseEvent} />
      </AppTestProviders>
    );

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

    render(
      <AppTestProviders client={createTestQueryClient()}>
        <HostEventSettingsPanel slug={slug} hostToken={null} event={baseEvent} />
      </AppTestProviders>
    );

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

    render(
      <AppTestProviders client={createTestQueryClient()}>
        <HostEventSettingsPanel
          slug={slug}
          hostToken={null}
          event={{ ...baseEvent, participantCount: 2 }}
        />
      </AppTestProviders>
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

    render(
      <AppTestProviders client={createTestQueryClient()}>
        <HostEventSettingsPanel
          slug={slug}
          hostToken={null}
          event={{ ...baseEvent, participantCount: 5 }}
        />
      </AppTestProviders>
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
    render(
      <AppTestProviders client={createTestQueryClient()}>
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
      </AppTestProviders>
    );

    await user.click(screen.getByText('Paramètres de la soirée'));
    expect(screen.getByText(/n'est plus modifiable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^enregistrer$/i })).toBeDisabled();
  });
});
