import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';
import { ApiError } from '@/shared/api/apiError';
import { deleteMovieRating, setMovieRating } from '@/features/movies/api/moviesApi';
import { useEventMovieRating } from '@/features/events/pages/event-detail/useEventMovieRating';

vi.mock('@/features/movies/api/moviesApi', () => ({
  setMovieRating: vi.fn(),
  deleteMovieRating: vi.fn(),
}));

const mockSet = vi.mocked(setMovieRating);
const mockDelete = vi.mocked(deleteMovieRating);

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return createElement(LocaleProvider, null, createElement(ConsentProvider, null, children));
}

function renderRating(
  refreshAll = vi.fn(),
  participant: { participantId: string; pseudo: string } | null = {
    participantId: 'p1',
    pseudo: 'Alice',
  }
) {
  const hook = renderHook(() => useEventMovieRating({ slug: 'soiree', participant, refreshAll }), {
    wrapper,
  });
  return { hook, refreshAll };
}

describe('useEventMovieRating', () => {
  beforeEach(() => {
    mockSet.mockReset();
    mockDelete.mockReset();
  });

  it('saves a rating for my participation and refreshes the page', async () => {
    mockSet.mockResolvedValueOnce({ participantId: 'p1', value: 8, updatedAt: 'now' });
    const { hook, refreshAll } = renderRating();

    let done = false;
    await act(async () => {
      done = await hook.result.current.save('m1', 8);
    });

    expect(done).toBe(true);
    expect(mockSet).toHaveBeenCalledWith('soiree', 'm1', 'p1', 8);
    expect(refreshAll).toHaveBeenCalledTimes(1);
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.saving).toBe(false);
  });

  it('keeps the previous rating and exposes a translated error when the API refuses', async () => {
    mockSet.mockRejectedValueOnce(
      new ApiError('Seuls les films choisis de la soirée se notent.', {
        code: 409,
        reason: 'rating_only_chosen_movie',
      })
    );
    const { hook, refreshAll } = renderRating();

    let done = true;
    await act(async () => {
      done = await hook.result.current.save('m1', 8);
    });

    expect(done).toBe(false);
    expect(refreshAll).not.toHaveBeenCalled();
    expect(hook.result.current.error).toBe('Seuls les films choisis de la soirée se notent.');
  });

  it('falls back to a generic message when the failure carries no message', async () => {
    mockSet.mockRejectedValueOnce('boom');
    const { hook } = renderRating();

    await act(async () => {
      await hook.result.current.save('m1', 8);
    });

    expect(hook.result.current.error).toBe("Votre note n'a pas été enregistrée. Réessayez.");
  });

  it('clears a rating and refreshes', async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    const { hook, refreshAll } = renderRating();

    let done = false;
    await act(async () => {
      done = await hook.result.current.clear('m1');
    });

    expect(done).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith('soiree', 'm1', 'p1');
    expect(refreshAll).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a participation', async () => {
    const { hook } = renderRating(vi.fn(), null);

    let done = true;
    await act(async () => {
      done = await hook.result.current.save('m1', 8);
    });

    expect(done).toBe(false);
    expect(mockSet).not.toHaveBeenCalled();
  });
});
