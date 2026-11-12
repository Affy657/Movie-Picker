import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchApi } from '@/shared/api/client';
import { fetchMovieShowcase, showcaseQueryKey } from '@/features/movies/api/showcaseApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));

const mockFetchApi = vi.mocked(fetchApi);

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe('director showcase', () => {
  it('asks the films a person directed', async () => {
    mockFetchApi.mockResolvedValue({ section: 'director', items: [{ id: 329865 }] });

    const res = await fetchMovieShowcase({ section: 'director', personId: 137427 });

    expect(mockFetchApi).toHaveBeenCalledWith(
      '/movies/showcase?section=director&personId=137427',
      undefined
    );
    expect(res.items).toEqual([{ id: 329865 }]);
  });

  it('caches each director apart', () => {
    expect(showcaseQueryKey({ section: 'director', personId: 1 })).not.toEqual(
      showcaseQueryKey({ section: 'director', personId: 2 })
    );
  });
});
