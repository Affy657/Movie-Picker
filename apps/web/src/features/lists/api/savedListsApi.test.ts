import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchApi } from '@/shared/api/client';
import {
  copySavedList,
  fetchSavedList,
  fetchSavedListBySource,
  fetchSavedLists,
  saveList,
  unsaveList,
} from '@/features/lists/api/savedListsApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));

const mockFetchApi = vi.mocked(fetchApi);

const HARRY_POTTER = { sourceType: 'tmdbCollection' as const, sourceId: '1241' };

const summary = {
  id: 's1',
  ...HARRY_POTTER,
  name: 'Harry Potter',
  itemCount: 8,
  posterPaths: ['/hp1.jpg'],
  watchedCount: 6,
  createdAt: '2026-11-01T00:00:00Z',
  unavailable: false,
};

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe('fetchSavedLists', () => {
  it('reads the saved lists of the account', async () => {
    mockFetchApi.mockResolvedValue({ items: [summary] });

    expect(await fetchSavedLists()).toEqual([summary]);
    expect(mockFetchApi).toHaveBeenCalledWith('/saved-lists', { signal: undefined });
  });

  it('reads a missing items array as no saved list', async () => {
    mockFetchApi.mockResolvedValue(null);

    expect(await fetchSavedLists()).toEqual([]);
  });
});

describe('fetchSavedListBySource', () => {
  it('asks whether a saga is saved and gives its summary', async () => {
    mockFetchApi.mockResolvedValue({ items: [summary] });
    const controller = new AbortController();

    expect(await fetchSavedListBySource(HARRY_POTTER, controller.signal)).toEqual(summary);
    expect(mockFetchApi).toHaveBeenCalledWith(
      '/saved-lists?sourceType=tmdbCollection&sourceId=1241',
      { signal: controller.signal }
    );
  });

  it('gives nothing when the source is not saved', async () => {
    mockFetchApi.mockResolvedValue({ items: [] });

    expect(await fetchSavedListBySource(HARRY_POTTER)).toBeNull();
  });
});

describe('fetchSavedList', () => {
  it('reads one saved list with its films', async () => {
    const film = { tmdbId: 671, mediaType: 'movie', title: 'Harry Potter 1', isWatched: true };
    mockFetchApi.mockResolvedValue({ ...summary, items: [film] });

    const list = await fetchSavedList('s1');

    expect(mockFetchApi).toHaveBeenCalledWith('/saved-lists/s1', { signal: undefined });
    expect(list.items).toEqual([film]);
  });

  it('reads a missing items array as no film', async () => {
    mockFetchApi.mockResolvedValue(summary);

    expect((await fetchSavedList('s1')).items).toEqual([]);
  });
});

describe('saved list mutations', () => {
  it('saves a source', async () => {
    mockFetchApi.mockResolvedValue(summary);

    expect(await saveList(HARRY_POTTER)).toEqual(summary);
    expect(mockFetchApi).toHaveBeenCalledWith('/saved-lists', {
      method: 'POST',
      body: JSON.stringify(HARRY_POTTER),
    });
  });

  it('stops saving a list', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await unsaveList('s1');

    expect(mockFetchApi).toHaveBeenCalledWith('/saved-lists/s1', { method: 'DELETE' });
  });

  it('copies a saved list into a new created list', async () => {
    mockFetchApi.mockResolvedValue({ id: 'l9', name: 'Harry Potter' });

    expect(await copySavedList('s1', 'Harry Potter')).toEqual({ id: 'l9', name: 'Harry Potter' });
    expect(mockFetchApi).toHaveBeenCalledWith('/saved-lists/s1/copy', {
      method: 'POST',
      body: JSON.stringify({ name: 'Harry Potter' }),
    });
  });
});
