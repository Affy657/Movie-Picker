import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchApi } from '@/shared/api/client';
import {
  copyPublicList,
  fetchPublicList,
  fetchPublicLists,
} from '@/features/lists/api/publicListsApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));

const mockFetchApi = vi.mocked(fetchApi);

const summary = {
  id: 'l1',
  name: 'Ciné coréen',
  description: null,
  itemCount: 18,
  posterPaths: ['/a.jpg'],
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-02T00:00:00Z',
  memberCount: 1,
  watchedCount: 2,
};

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe('fetchPublicLists', () => {
  it('reads the public lists of a member', async () => {
    mockFetchApi.mockResolvedValue({ items: [summary] });
    const controller = new AbortController();

    expect(await fetchPublicLists('alice', controller.signal)).toEqual([summary]);
    expect(mockFetchApi).toHaveBeenCalledWith('/users/alice/lists', {
      signal: controller.signal,
    });
  });

  it('reads a missing items array as no public list', async () => {
    mockFetchApi.mockResolvedValue(null);

    expect(await fetchPublicLists('alice')).toEqual([]);
  });
});

describe('fetchPublicList', () => {
  it('reads a public list with its films in the order they were added', async () => {
    const film = { tmdbId: 1, mediaType: 'movie', title: 'Old Boy', isWatched: true };
    mockFetchApi.mockResolvedValue({ ...summary, items: [film] });

    const list = await fetchPublicList('alice', 'l1');

    expect(mockFetchApi).toHaveBeenCalledWith('/users/alice/lists/l1', { signal: undefined });
    expect(list.items).toEqual([film]);
  });

  it('reads a missing items array as no film', async () => {
    mockFetchApi.mockResolvedValue(summary);

    expect((await fetchPublicList('alice', 'l1')).items).toEqual([]);
  });
});

describe('copyPublicList', () => {
  it('copies the public list of a member into a new list of mine', async () => {
    mockFetchApi.mockResolvedValue({ id: 'l9', name: 'Ciné coréen' });

    expect(await copyPublicList({ handle: 'alice', listId: 'l1' }, 'Ciné coréen')).toEqual({
      id: 'l9',
      name: 'Ciné coréen',
    });
    expect(mockFetchApi).toHaveBeenCalledWith('/users/alice/lists/l1/copy', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ciné coréen' }),
    });
  });
});
