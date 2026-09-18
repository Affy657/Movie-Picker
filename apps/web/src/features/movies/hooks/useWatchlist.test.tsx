import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useAddToWatchlist, useRemoveFromWatchlist } from './useWatchlist';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { createTestQueryClient, withQueryClient } from '@/test-utils/queryWrapper';
import type { ReactNode } from 'react';

vi.mock('@/features/movies/api/watchlistApi', () => ({
  fetchWatchlist: vi.fn(),
  addToWatchlist: vi.fn().mockResolvedValue(undefined),
  removeFromWatchlist: vi.fn().mockResolvedValue(undefined),
}));

function setup<T>(hook: () => T, ownHandle?: string) {
  const client = createTestQueryClient();
  if (ownHandle) client.setQueryData(queryKeys.auth.me, { id: 'u1', handle: ownHandle });
  const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) =>
    withQueryClient(<>{children}</>, client);
  const rendered = renderHook(hook, { wrapper });
  return { ...rendered, invalidateSpy };
}

describe('useWatchlist mutations', () => {
  it("an addition refreshes my list and my public profile, not other people's", async () => {
    const { result, invalidateSpy } = setup(() => useAddToWatchlist(), 'alice');

    act(() =>
      result.current.mutate({ tmdbId: 1, title: 'Matrix', year: '1999', posterPath: null })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.watchlist.list });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.watchlist.availability });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.profile.public('alice') });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: queryKeys.profile.publicAll });
  });

  it('a removal without a cached account only refreshes my list and its availability', async () => {
    const { result, invalidateSpy } = setup(() => useRemoveFromWatchlist());

    act(() => result.current.mutate({ tmdbId: 1 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.watchlist.list });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.watchlist.availability });
  });
});
