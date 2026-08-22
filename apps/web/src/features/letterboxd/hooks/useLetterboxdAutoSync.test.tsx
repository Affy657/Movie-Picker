import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { TEST_API_V1 } from '@/mocks/handlers';
import { useLetterboxdAutoSync } from './useLetterboxdAutoSync';

function meHandler(letterboxdUsername: string | null) {
  return http.get(`${TEST_API_V1}/auth/me`, () =>
    HttpResponse.json({
      userId: 'u-acc',
      displayName: 'Pat',
      emailMasked: 'p***@test.local',
      uiTheme: 'light',
      accentColor: 'default',
      ratingScale: 'five',
      avatarId: 'alpha',
      handle: 'pat',
      bio: null,
      isProfilePublic: true,
      letterboxdUsername,
      letterboxdLastSyncAt: null,
      letterboxdLastSyncError: null,
    })
  );
}

function Probe() {
  useLetterboxdAutoSync();
  return null;
}

function renderProbe(client = createTestQueryClient()) {
  return render(
    <AppTestProviders client={client}>
      <Probe />
    </AppTestProviders>
  );
}

describe('useLetterboxdAutoSync', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('appelle la synchro non forcée quand un pseudo est enregistré', async () => {
    let calls = 0;
    let sawForceFalse = false;

    server.use(
      meHandler('affy657'),
      http.post(`${TEST_API_V1}/letterboxd/sync`, ({ request }) => {
        calls++;
        sawForceFalse = request.url.includes('force=false');
        return HttpResponse.json({
          skipped: false,
          added: 0,
          removed: 0,
          unmatchedTitles: [],
          pendingChoices: [],
          totalOnLetterboxd: 0,
          totalTruncated: 0,
        });
      })
    );

    renderProbe();

    await waitFor(() => expect(calls).toBe(1));
    expect(sawForceFalse).toBe(true);
  });

  it('invalide les notifications quand des films sont à réconcilier', async () => {
    server.use(
      meHandler('affy657'),
      http.post(`${TEST_API_V1}/letterboxd/sync`, () =>
        HttpResponse.json({
          skipped: false,
          added: 0,
          removed: 0,
          unmatchedTitles: [],
          pendingChoices: [
            {
              rowIndex: 1,
              title: 'Dune',
              year: '2024',
              letterboxdSlug: 'dune-2024',
              candidates: [],
            },
          ],
          totalOnLetterboxd: 1,
          totalTruncated: 0,
        })
      )
    );

    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    renderProbe(client);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.notifications.inbox })
    );
  });

  it('ne fait aucun appel de synchro sans pseudo Letterboxd', async () => {
    let calls = 0;

    server.use(
      meHandler(null),
      http.post(`${TEST_API_V1}/letterboxd/sync`, () => {
        calls++;
        return HttpResponse.json({
          skipped: true,
          added: 0,
          removed: 0,
          unmatchedTitles: [],
          pendingChoices: [],
          totalOnLetterboxd: 0,
          totalTruncated: 0,
        });
      })
    );

    renderProbe();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toBe(0);
  });
});
