import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { setupServer } from 'msw/node';
import { delay, http } from 'msw';
import { apiErrorJson } from '@/mocks/apiJson';
import type { QueryClient } from '@tanstack/react-query';
import { LocaleProvider } from '@/shared/i18n';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { createTestQueryClient, withQueryClient } from '@/test-utils/queryWrapper';
import {
  createListsHandlers,
  createSavedListsHandlers,
  TEST_API_V1,
  type MockSavedList,
} from '@/mocks/handlers';
import {
  useCopySavedList,
  useSavedList,
  useSavedListToggle,
  useSavedLists,
  useUnsaveList,
} from './useSavedLists';

const HARRY_POTTER: MockSavedList = {
  id: 's1',
  sourceType: 'tmdbCollection',
  sourceId: '1241',
  name: 'Harry Potter',
  items: [
    {
      tmdbId: 671,
      mediaType: 'movie',
      title: 'Harry Potter 1',
      year: '2001',
      posterPath: '/hp1.jpg',
      isWatched: true,
    },
  ],
};

const HARRY_POTTER_SOURCE = { sourceType: 'tmdbCollection', sourceId: '1241' } as const;

function wrapperFor(client: QueryClient = createTestQueryClient()) {
  return ({ children }: { children: ReactNode }) =>
    withQueryClient(<LocaleProvider>{children}</LocaleProvider>, client);
}

describe('saved lists hooks', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('reads the saved lists of the account and one of them with its films', async () => {
    server.use(...createSavedListsHandlers([HARRY_POTTER]));
    const wrapper = wrapperFor();

    const mine = renderHook(() => useSavedLists(), { wrapper });
    const detail = renderHook(() => useSavedList('s1'), { wrapper });

    await waitFor(() => expect(mine.result.current.data).toHaveLength(1));
    expect(mine.result.current.data?.[0]).toMatchObject({
      name: 'Harry Potter',
      itemCount: 1,
      watchedCount: 1,
    });
    await waitFor(() => expect(detail.result.current.data?.items).toHaveLength(1));
  });

  it('saves a saga at once, before the server answers, then stops saving it', async () => {
    server.use(
      http.post(`${TEST_API_V1}/saved-lists`, async () => {
        await delay(50);
      }),
      ...createSavedListsHandlers([], [HARRY_POTTER])
    );

    const { result } = renderHook(() => useSavedListToggle(HARRY_POTTER_SOURCE, true), {
      wrapper: wrapperFor(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.saved).toBe(false);

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.saved).toBe(true));
    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.saved).toBe(true);

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.saved).toBe(false));
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.saved).toBe(false);
  });

  it('comes back to the previous state and says why when saving fails', async () => {
    server.use(
      http.post(`${TEST_API_V1}/saved-lists`, () =>
        apiErrorJson(409, 'saved_list_limit_reached', { max: 50 })
      ),
      ...createSavedListsHandlers()
    );

    const { result } = renderHook(() => useSavedListToggle(HARRY_POTTER_SOURCE, true), {
      wrapper: wrapperFor(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.toggle());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.saved).toBe(false);
  });

  it('refreshes the summary of Mes listes once a saga is saved from Explorer', async () => {
    server.use(...createSavedListsHandlers([], [HARRY_POTTER]));
    const wrapper = wrapperFor();
    const mine = renderHook(() => useSavedLists(), { wrapper });
    const toggle = renderHook(() => useSavedListToggle(HARRY_POTTER_SOURCE, true), { wrapper });
    await waitFor(() => expect(mine.result.current.data).toEqual([]));
    await waitFor(() => expect(toggle.result.current.isLoading).toBe(false));

    act(() => toggle.result.current.toggle());

    await waitFor(() => expect(mine.result.current.data).toHaveLength(1));
  });

  it('stops saving a list without asking its page again, and updates the Explorer button', async () => {
    let detailReads = 0;
    server.use(
      http.get(`${TEST_API_V1}/saved-lists/s1`, () => {
        detailReads += 1;
      }),
      ...createSavedListsHandlers([HARRY_POTTER])
    );
    const wrapper = wrapperFor();
    const detail = renderHook(() => useSavedList('s1'), { wrapper });
    const button = renderHook(() => useSavedListToggle(HARRY_POTTER_SOURCE, true), { wrapper });
    const unsave = renderHook(() => useUnsaveList(), { wrapper });
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(button.result.current.saved).toBe(true));

    await act(() => unsave.result.current.mutateAsync('s1'));

    await waitFor(() => expect(button.result.current.saved).toBe(false));
    expect(detailReads).toBe(1);
  });

  it('copies a saved list into a new created list and refreshes the created lists', async () => {
    server.use(...createSavedListsHandlers([HARRY_POTTER]), ...createListsHandlers([]));
    const client = createTestQueryClient();
    const wrapper = wrapperFor(client);
    const copy = renderHook(() => useCopySavedList(), { wrapper });
    client.setQueryData(queryKeys.lists.mine, []);

    let created: { id: string; name: string } | undefined;
    await act(async () => {
      created = await copy.result.current.mutateAsync({ id: 's1', name: 'Mon Harry Potter' });
    });

    expect(created).toMatchObject({ id: 'copy1', name: 'Mon Harry Potter' });
    expect(client.getQueryState(queryKeys.lists.mine)?.isInvalidated).toBe(true);
  });
});
