import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchApi } from '@/shared/api/client';
import {
  addListItem,
  createList,
  deleteList,
  fetchList,
  fetchMyLists,
  removeListItem,
  updateList,
} from '@/features/library/api/listsApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));

const mockFetchApi = vi.mocked(fetchApi);

const movie = {
  tmdbId: 438631,
  mediaType: 'movie' as const,
  title: 'Dune',
  year: '2021',
  posterPath: null,
};

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe('fetchMyLists', () => {
  it('reads the created lists of the account', async () => {
    mockFetchApi.mockResolvedValue({ items: [{ id: 'l1', name: 'Halloween' }] });

    const lists = await fetchMyLists();

    expect(mockFetchApi).toHaveBeenCalledWith('/lists', { signal: undefined });
    expect(lists).toEqual([{ id: 'l1', name: 'Halloween' }]);
  });

  it('asks which lists hold a given title', async () => {
    mockFetchApi.mockResolvedValue({ items: [] });
    const controller = new AbortController();

    await fetchMyLists({ tmdbId: 438631, mediaType: 'tv' }, controller.signal);

    expect(mockFetchApi).toHaveBeenCalledWith('/lists?tmdbId=438631&mediaType=tv', {
      signal: controller.signal,
    });
  });

  it('reads a missing items array as no list', async () => {
    mockFetchApi.mockResolvedValue(null);

    expect(await fetchMyLists()).toEqual([]);
  });
});

describe('fetchList', () => {
  it('reads one list with its titles', async () => {
    mockFetchApi.mockResolvedValue({ id: 'l1', name: 'Halloween', items: [movie] });

    const list = await fetchList('l1');

    expect(mockFetchApi).toHaveBeenCalledWith('/lists/l1', { signal: undefined });
    expect(list.items).toEqual([movie]);
  });

  it('reads a missing items array as an empty list', async () => {
    mockFetchApi.mockResolvedValue({ id: 'l1', name: 'Halloween' });

    expect((await fetchList('l1')).items).toEqual([]);
  });
});

describe('list mutations', () => {
  it('creates a list, with a first title when given', async () => {
    mockFetchApi.mockResolvedValue({ id: 'l2', name: 'Villeneuve' });

    const created = await createList({ name: 'Villeneuve', firstItem: movie });

    expect(mockFetchApi).toHaveBeenCalledWith('/lists', {
      method: 'POST',
      body: JSON.stringify({ name: 'Villeneuve', firstItem: movie }),
    });
    expect(created.id).toBe('l2');
  });

  it('renames and describes a list', async () => {
    mockFetchApi.mockResolvedValue({ id: 'l1' });

    await updateList('l1', { name: 'Halloween', description: 'La nuit du 31' });

    expect(mockFetchApi).toHaveBeenCalledWith('/lists/l1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Halloween', description: 'La nuit du 31' }),
    });
  });

  it('deletes a list', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await deleteList('l1');

    expect(mockFetchApi).toHaveBeenCalledWith('/lists/l1', { method: 'DELETE' });
  });

  it('adds a title to a list and removes it', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await addListItem('l1', movie);
    await removeListItem('l1', 438631, 'tv');

    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/lists/l1/items', {
      method: 'POST',
      body: JSON.stringify(movie),
    });
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/lists/l1/items/438631?mediaType=tv', {
      method: 'DELETE',
    });
  });
});
