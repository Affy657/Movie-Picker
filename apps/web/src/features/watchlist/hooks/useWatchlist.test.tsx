import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useAddToWatchlist, useRemoveFromWatchlist } from './useWatchlist';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { createTestQueryClient, withQueryClient } from '@/test-utils/queryWrapper';
import type { ReactNode } from 'react';

vi.mock('@/features/watchlist/api/watchlistApi', () => ({
  fetchWatchlist: vi.fn(),
  addToWatchlist: vi.fn().mockResolvedValue(undefined),
  removeFromWatchlist: vi.fn().mockResolvedValue(undefined),
}));

function setup<T>(hook: () => T) {
  const client = createTestQueryClient();
  const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) =>
    withQueryClient(<>{children}</>, client);
  const rendered = renderHook(hook, { wrapper });
  return { ...rendered, invalidateSpy };
}

describe('useWatchlist mutations', () => {
  it('un ajout rafraîchit ma liste et les profils publics en cache', async () => {
    const { result, invalidateSpy } = setup(() => useAddToWatchlist());

    act(() =>
      result.current.mutate({ tmdbId: 1, title: 'Matrix', year: '1999', posterPath: null })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.watchlist.list });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.profile.publicAll });
  });

  it('un retrait rafraîchit ma liste et les profils publics en cache', async () => {
    const { result, invalidateSpy } = setup(() => useRemoveFromWatchlist());

    act(() => result.current.mutate({ tmdbId: 1 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.watchlist.list });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.profile.publicAll });
  });
});
