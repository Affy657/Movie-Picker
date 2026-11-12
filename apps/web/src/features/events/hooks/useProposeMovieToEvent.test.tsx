import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClientWrapper, createTestQueryClient } from '@/test-utils/queryWrapper';
import { LocaleProvider } from '@/shared/i18n';
import { queryKeys } from '@/shared/hooks/queryKeys';
import type { EventData } from '@/features/events/types';
import { fetchEventBySlug } from '@/features/events/api/eventsApi';
import { addMovieToEvent } from '@/features/movies/api/moviesApi';
import { useProposeMovieToEvent } from '@/features/events/hooks/useProposeMovieToEvent';

vi.mock('@/features/events/api/eventsApi', () => ({ fetchEventBySlug: vi.fn() }));
vi.mock('@/features/movies/api/moviesApi', () => ({ addMovieToEvent: vi.fn() }));

describe('useProposeMovieToEvent', () => {
  it('marks the nights of the proposed film stale, and only those', async () => {
    vi.mocked(fetchEventBySlug).mockResolvedValue({
      myParticipant: { id: 'p1', pseudo: 'Alice' },
    } as unknown as EventData);
    vi.mocked(addMovieToEvent).mockResolvedValue(undefined as never);
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.movies.nights(438631, 'movie'), { nights: [] });
    client.setQueryData(queryKeys.movies.nights(1399, 'tv'), { nights: [] });
    const { result } = renderHook(() => useProposeMovieToEvent(), {
      wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
        <QueryClientWrapper client={client}>
          <LocaleProvider>{children}</LocaleProvider>
        </QueryClientWrapper>
      ),
    });

    await result.current('Ab3x', {
      tmdbId: 438631,
      mediaType: 'movie',
      title: 'Dune',
      year: '2021',
      posterPath: null,
    });

    expect(client.getQueryState(queryKeys.movies.nights(438631, 'movie'))?.isInvalidated).toBe(
      true
    );
    expect(client.getQueryState(queryKeys.movies.nights(1399, 'tv'))?.isInvalidated).toBe(false);
  });
});
