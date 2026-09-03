import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { fetchMovieDetails } from '@/features/movies/api/moviesApi';
import { useMovieDetails } from '@/features/movies/hooks/useMovieDetails';

vi.mock('@/features/movies/api/moviesApi', () => ({ fetchMovieDetails: vi.fn() }));

const mockFetch = vi.mocked(fetchMovieDetails);

const wrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useMovieDetails', () => {
  it('stays idle when disabled', () => {
    const { result } = renderHook(() => useMovieDetails(27205, false), { wrapper: wrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('stays idle for an invalid tmdbId', () => {
    const { result } = renderHook(() => useMovieDetails(0, true), { wrapper: wrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches details when enabled with a valid id', async () => {
    mockFetch.mockResolvedValue({
      tmdbId: 27205,
      title: 'Inception',
      overview: null,
      tagline: null,
      director: null,
      cast: [],
      runtimeMinutes: null,
      genres: [],
      releaseDate: null,
      watchProviders: [],
      tmdbWatchPageUrl: null,
    });

    const { result } = renderHook(() => useMovieDetails(27205, true, 'movie'), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe('Inception');
    expect(mockFetch).toHaveBeenCalledWith(27205, expect.objectContaining({ mediaType: 'movie' }));
  });
});
