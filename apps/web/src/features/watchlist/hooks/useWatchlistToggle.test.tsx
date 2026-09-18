import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act, type ReactNode } from 'react';
import { LocaleProvider } from '@/shared/i18n';
import { createTestQueryClient, withQueryClient } from '@/test-utils/queryWrapper';
import { addToWatchlist, removeFromWatchlist } from '@/features/movies/api/watchlistApi';
import { useWatchlistToggle } from './useWatchlistToggle';

vi.mock('@/features/movies/api/watchlistApi', () => ({
  fetchWatchlist: vi
    .fn()
    .mockResolvedValue([
      { tmdbId: 1, mediaType: 'movie', title: 'Matrix', year: '1999', posterPath: null },
    ]),
  addToWatchlist: vi.fn().mockResolvedValue(undefined),
  removeFromWatchlist: vi.fn().mockResolvedValue(undefined),
}));

const matrix = {
  tmdbId: 1,
  mediaType: 'movie' as const,
  title: 'Matrix',
  year: '1999',
  posterPath: null,
};
const alien = {
  tmdbId: 2,
  mediaType: 'movie' as const,
  title: 'Alien',
  year: '1979',
  posterPath: null,
};

function setup(enabled = true) {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) =>
    withQueryClient(<LocaleProvider>{children}</LocaleProvider>, client);
  return renderHook(() => useWatchlistToggle(enabled), { wrapper });
}

describe('useWatchlistToggle', () => {
  it('knows which movies are already in the list', async () => {
    const { result } = setup();

    await waitFor(() => expect(result.current.has(matrix)).toBe(true));
    expect(result.current.has(alien)).toBe(false);
  });

  it('removes a present movie and adds a missing one', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.has(matrix)).toBe(true));

    act(() => result.current.toggle(matrix));
    await waitFor(() =>
      expect(removeFromWatchlist).toHaveBeenCalledWith(matrix.tmdbId, matrix.mediaType)
    );

    act(() => result.current.toggle(alien));
    await waitFor(() => expect(addToWatchlist).toHaveBeenCalledWith(alien));
  });

  it('surfaces the server message when an addition fails', async () => {
    vi.mocked(addToWatchlist).mockRejectedValueOnce(new Error('Liste pleine'));
    const { result } = setup();
    await waitFor(() => expect(result.current.has(matrix)).toBe(true));

    act(() => result.current.toggle(alien));

    await waitFor(() => expect(result.current.error).toBe('Liste pleine'));
  });

  it('ne charge rien tant que le compte est absent', () => {
    const { result } = setup(false);

    expect(result.current.has(matrix)).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
