import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import MovieReactionBar from '@/features/movies/components/MovieReactionBar';
import { QueryClientWrapper, createTestQueryClient } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

describe('MovieReactionBar (MSW)', () => {
  const server = setupServer();
  const slug = 'evt-rx';
  const movieId = 'm1';
  const participantId = 'p1';

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('envoie POST réaction au clic et appelle onRefresh', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    const onError = vi.fn();

    server.use(
      http.post(
        `${TEST_API_V1}/events/${slug}/movies/${movieId}/reactions`,
        async ({ request }) => {
          const body = (await request.json()) as { participantId: string; reactionId: string };
          expect(body.participantId).toBe(participantId);
          expect(body.reactionId).toBe('already_seen');
          return HttpResponse.json({ ok: true });
        }
      )
    );

    render(
      <QueryClientWrapper client={createTestQueryClient()}>
        <MovieReactionBar
          slug={slug}
          movieId={movieId}
          participantId={participantId}
          participantPseudo="Alice"
          reactions={[]}
          allowedReactionIds={['already_seen', 'meh']}
          readOnly={false}
          onRefresh={onRefresh}
          onError={onError}
        />
      </QueryClientWrapper>
    );

    await user.click(screen.getByRole('button', { name: /déjà vu/i }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(onError).not.toHaveBeenCalled();
  });

  it('mode lecture seule : n’affiche que les réactions avec compteur > 0', () => {
    render(
      <QueryClientWrapper client={createTestQueryClient()}>
        <MovieReactionBar
          slug={slug}
          movieId={movieId}
          participantId={null}
          participantPseudo={null}
          reactions={[{ reactionId: 'meh', count: 2, pseudos: ['Bob'] }]}
          allowedReactionIds={['already_seen', 'meh']}
          readOnly
          onRefresh={() => {}}
          onError={() => {}}
        />
      </QueryClientWrapper>
    );

    expect(screen.getByLabelText(/^réactions$/i)).toBeInTheDocument();
    expect(screen.getByText('Bof')).toBeInTheDocument();
    expect(screen.queryByText('Déjà vu')).not.toBeInTheDocument();
  });
});
