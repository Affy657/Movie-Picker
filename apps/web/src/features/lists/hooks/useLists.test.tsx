import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { LocaleProvider } from '@/shared/i18n';
import { createTestQueryClient, withQueryClient } from '@/test-utils/queryWrapper';
import { createListsHandlers, TEST_API_V1 } from '@/mocks/handlers';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { addListItem } from '@/features/lists/api/listsApi';
import {
  useCreateList,
  useDeleteList,
  useList,
  useListMembershipToggle,
  useMyLists,
  useRemoveListItem,
  useUpdateList,
} from './useLists';

type ListsApi = typeof import('@/features/lists/api/listsApi');

vi.mock('@/features/lists/api/listsApi', async (importOriginal) => {
  const actual = await importOriginal<ListsApi>();
  return { ...actual, addListItem: vi.fn(actual.addListItem) };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const dune = {
  tmdbId: 438631,
  mediaType: 'movie' as const,
  title: 'Dune',
  year: '2021',
  posterPath: '/dune.jpg',
};

const scream = { ...dune, tmdbId: 4232, title: 'Scream', posterPath: '/scream.jpg' };

function wrapperFor() {
  const client = createTestQueryClient();
  return ({ children }: { children: ReactNode }) =>
    withQueryClient(<LocaleProvider>{children}</LocaleProvider>, client);
}

function useListsProbe() {
  return {
    mine: useMyLists(),
    create: useCreateList(),
    update: useUpdateList(),
    remove: useDeleteList(),
  };
}

describe('lists hooks', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('reads the created lists of the account', async () => {
    server.use(...createListsHandlers([{ id: 'l1', name: 'Halloween', items: [scream] }]));

    const { result } = renderHook(() => useMyLists(), { wrapper: wrapperFor() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0]).toMatchObject({
      name: 'Halloween',
      itemCount: 1,
      posterPaths: ['/scream.jpg'],
    });
  });

  it('creates, renames then deletes a list, the summaries following each step', async () => {
    server.use(...createListsHandlers());
    const { result } = renderHook(() => useListsProbe(), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.mine.data).toEqual([]));

    let id = '';
    await act(async () => {
      id = (await result.current.create.mutateAsync({ name: 'Halloween' })).id;
    });
    await waitFor(() => expect(result.current.mine.data?.[0]?.name).toBe('Halloween'));

    await act(() =>
      result.current.update.mutateAsync({ id, body: { name: 'Nuit du 31', description: 'Peur' } })
    );
    await waitFor(() => expect(result.current.mine.data?.[0]?.name).toBe('Nuit du 31'));

    await act(() => result.current.remove.mutateAsync(id));
    await waitFor(() => expect(result.current.mine.data).toEqual([]));
  });

  it('is refused the names of the system lists by the mocked API, as by the real one', async () => {
    server.use(...createListsHandlers());
    const { result } = renderHook(() => useCreateList(), { wrapper: wrapperFor() });

    for (const name of ['À voir', 'Watchlist', 'Films vus', 'Watched']) {
      await expect(result.current.mutateAsync({ name })).rejects.toMatchObject({
        reason: 'list_name_taken',
      });
    }
  });

  it('refreshes the figures of the profile once a list is created, edited or deleted', async () => {
    server.use(...createListsHandlers());
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useListsProbe(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        withQueryClient(<LocaleProvider>{children}</LocaleProvider>, client),
    });

    let id = '';
    await act(async () => {
      id = (await result.current.create.mutateAsync({ name: 'Ciné coréen', isPublic: true })).id;
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.profile.statsAll });

    invalidate.mockClear();
    await act(() =>
      result.current.update.mutateAsync({ id, body: { name: 'Ciné coréen', isPublic: false } })
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.profile.statsAll });

    invalidate.mockClear();
    await act(() => result.current.remove.mutateAsync(id));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.profile.statsAll });
  });

  it('reads one list and refreshes it once a title leaves it', async () => {
    server.use(...createListsHandlers([{ id: 'l1', name: 'Halloween', items: [scream, dune] }]));
    const { result } = renderHook(
      () => ({ list: useList('l1'), removeItem: useRemoveListItem() }),
      { wrapper: wrapperFor() }
    );
    await waitFor(() => expect(result.current.list.data?.items).toHaveLength(2));

    await act(() =>
      result.current.removeItem.mutateAsync({ listId: 'l1', tmdbId: 4232, mediaType: 'movie' })
    );

    await waitFor(() =>
      expect(result.current.list.data?.items.map((i) => i.title)).toEqual(['Dune'])
    );
  });

  describe('useListMembershipToggle', () => {
    it('knows which lists hold the title and counts them', async () => {
      server.use(
        ...createListsHandlers([
          { id: 'l1', name: 'Halloween', items: [scream] },
          { id: 'l2', name: 'Science-fiction', items: [dune] },
        ])
      );

      const { result } = renderHook(() => useListMembershipToggle(dune, true), {
        wrapper: wrapperFor(),
      });

      await waitFor(() => expect(result.current.lists).toHaveLength(2));
      expect(result.current.lists.map((list) => list.containsMovie)).toEqual([false, true]);
      expect(result.current.count).toBe(1);
    });

    it('adds the title to a list on check and takes it out on uncheck', async () => {
      server.use(...createListsHandlers([{ id: 'l1', name: 'Halloween', items: [scream] }]));
      const { result } = renderHook(() => useListMembershipToggle(dune, true), {
        wrapper: wrapperFor(),
      });
      await waitFor(() => expect(result.current.lists).toHaveLength(1));

      act(() => result.current.toggle('l1'));
      await waitFor(() => expect(result.current.lists[0]?.containsMovie).toBe(true));
      await waitFor(() => expect(result.current.count).toBe(1));

      act(() => result.current.toggle('l1'));
      await waitFor(() => expect(result.current.lists[0]?.containsMovie).toBe(false));
      await waitFor(() => expect(result.current.lists[0]?.itemCount).toBe(1));
      expect(result.current.error).toBeNull();
    });

    it('unchecks the list again and says why when the list is full', async () => {
      server.use(
        http.post(`${TEST_API_V1}/lists/l1/items`, () =>
          HttpResponse.json(
            { reason: 'list_full', error: 'full', params: { max: 500 } },
            { status: 409 }
          )
        ),
        ...createListsHandlers([{ id: 'l1', name: 'Halloween' }])
      );
      const { result } = renderHook(() => useListMembershipToggle(dune, true), {
        wrapper: wrapperFor(),
      });
      await waitFor(() => expect(result.current.lists).toHaveLength(1));

      act(() => result.current.toggle('l1'));

      await waitFor(() =>
        expect(result.current.error).toBe('Cette liste est pleine : 500 films au plus.')
      );
      expect(result.current.lists[0]?.containsMovie).toBe(false);
    });

    it('says the adding failed, not the removal, when an add fails without a message', async () => {
      vi.mocked(addListItem).mockRejectedValueOnce('offline');
      server.use(...createListsHandlers([{ id: 'l1', name: 'Halloween' }]));
      const { result } = renderHook(() => useListMembershipToggle(dune, true), {
        wrapper: wrapperFor(),
      });
      await waitFor(() => expect(result.current.lists).toHaveLength(1));

      act(() => result.current.toggle('l1'));

      await waitFor(() => expect(result.current.error).toBe('Ajout à la liste impossible.'));
      expect(result.current.lists[0]?.containsMovie).toBe(false);
    });

    it('takes back only the list whose change failed, and keeps the check of the one still on its way', async () => {
      const { addListItem: realAdd } = await vi.importActual<ListsApi>(
        '@/features/lists/api/listsApi'
      );
      const firstAdd = deferred<void>();
      const secondGate = deferred<void>();
      vi.mocked(addListItem)
        .mockImplementationOnce(() => firstAdd.promise)
        .mockImplementationOnce(async (listId, item) => {
          await secondGate.promise;
          return realAdd(listId, item);
        });
      let reads = 0;
      server.use(
        http.get(`${TEST_API_V1}/lists`, () => {
          reads++;
          return undefined;
        }),
        ...createListsHandlers([
          { id: 'l1', name: 'Halloween' },
          { id: 'l2', name: 'Science-fiction' },
        ])
      );
      const { result } = renderHook(() => useListMembershipToggle(dune, true), {
        wrapper: wrapperFor(),
      });
      await waitFor(() => expect(result.current.lists).toHaveLength(2));
      const checked = () => result.current.lists.map((list) => list.containsMovie);

      act(() => {
        result.current.toggle('l1');
        result.current.toggle('l2');
      });
      await waitFor(() => expect(checked()).toEqual([true, true]));

      act(() => firstAdd.reject(new Error('Ajout refusé')));

      await waitFor(() => expect(result.current.error).toBe('Ajout refusé'));
      expect(checked()).toEqual([false, true]);
      expect(reads).toBe(1);

      act(() => secondGate.resolve());

      await waitFor(() => expect(reads).toBe(2));
      await waitFor(() => expect(checked()).toEqual([false, true]));
      expect(result.current.count).toBe(1);
    });

    it('asks nothing while signed out', () => {
      const { result } = renderHook(() => useListMembershipToggle(dune, false), {
        wrapper: wrapperFor(),
      });

      expect(result.current.lists).toEqual([]);
      expect(result.current.count).toBe(0);
    });
  });
});
