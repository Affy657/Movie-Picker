import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { QueryClientWrapper, createTestQueryClient } from '../test-utils/queryWrapper';
import { TEST_API_V1 } from '../mocks/handlers';
import HostEventSettingsPanel from './HostEventSettingsPanel';
import type { EventData } from '../types/event';

const slug = 'evt-settings';
const baseEvent: EventData = {
  _id: 'e1',
  title: 'Test',
  date: '2030-01-01',
  time: '20:00',
  slug,
  isHost: true,
  terminé: false,
  config: {
    theme: 'SF',
    endDate: null,
    maxProposalsPerParticipant: null,
    wheelMode: 'strictRandom',
    allowedReactionIds: null,
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
        expect(Array.isArray(body.allowedReactionIds)).toBe(true);
        return HttpResponse.json({
          theme: 'SF',
          endDate: null,
          maxProposalsPerParticipant: null,
          wheelMode: 'strictRandom',
          allowedReactionIds: body.allowedReactionIds,
        });
      })
    );

    const qc = createTestQueryClient();
    render(
      <QueryClientWrapper client={qc}>
        <HostEventSettingsPanel slug={slug} hostToken={null} event={baseEvent} />
      </QueryClientWrapper>
    );

    await user.click(screen.getByText('Paramètres de la soirée'));
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await waitFor(() => expect(patched).toBe(true));
    await waitFor(() => expect(screen.getByText(/enregistrés/i)).toBeInTheDocument());
  });

  it('désactive le formulaire si la roue a été lancée', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientWrapper client={createTestQueryClient()}>
        <HostEventSettingsPanel
          slug={slug}
          hostToken={null}
          event={{
            ...baseEvent,
            winnerMovie: {
              _id: 'm1',
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
      </QueryClientWrapper>
    );

    await user.click(screen.getByText('Paramètres de la soirée'));
    expect(screen.getByText(/n'est plus modifiable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^enregistrer$/i })).toBeDisabled();
  });
});
