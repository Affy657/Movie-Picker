import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { TEST_API_V1 } from '@/mocks/handlers';
import { useLetterboxdAutoSync } from './useLetterboxdAutoSync';

function meBody(letterboxdUsername: string | null, userId = 'u-acc') {
  return {
    userId,
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
  };
}

function meHandler(letterboxdUsername: string | null) {
  return http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(meBody(letterboxdUsername)));
}

const NOTHING_CHANGED_REPORT = {
  skipped: false,
  added: 0,
  removed: 0,
  unmatchedTitles: [],
  pendingChoices: [],
  totalOnLetterboxd: 0,
  totalTruncated: 0,
};

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

  it('calls the non-forced sync when a username is saved', async () => {
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

  it('invalidates the notifications when films are to be reconciled', async () => {
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

  it('syncs the next account signed in without a reload, not only the first one', async () => {
    const forcedFlags: string[] = [];
    let serverMe = meBody('affy657');
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(serverMe)),
      http.post(`${TEST_API_V1}/letterboxd/sync`, ({ request }) => {
        forcedFlags.push(new URL(request.url).searchParams.get('force') ?? '');
        return HttpResponse.json(NOTHING_CHANGED_REPORT);
      })
    );
    const client = createTestQueryClient();

    renderProbe(client);
    await waitFor(() => expect(forcedFlags).toEqual(['false']));
    await waitFor(() => expect(client.isFetching()).toBe(0));

    act(() => client.setQueryData(queryKeys.auth.me, null));
    serverMe = meBody('other-cinephile', 'u-other');
    act(() => client.setQueryData(queryKeys.auth.me, serverMe));

    await waitFor(() => expect(forcedFlags).toEqual(['false', 'false']));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(forcedFlags).toEqual(['false', 'false']);
  });

  it('leaves a username connected during the session to the forced sync of its modal', async () => {
    let calls = 0;
    server.use(
      meHandler(null),
      http.post(`${TEST_API_V1}/letterboxd/sync`, () => {
        calls++;
        return HttpResponse.json(NOTHING_CHANGED_REPORT);
      })
    );
    const client = createTestQueryClient();

    renderProbe(client);
    await waitFor(() => expect(client.getQueryData(queryKeys.auth.me)).toBeTruthy());

    act(() => client.setQueryData(queryKeys.auth.me, meBody('affy657')));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toBe(0);
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
