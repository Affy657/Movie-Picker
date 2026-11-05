import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import {
  isRecentNight,
  ratingLinkTarget,
  useRatingLink,
} from '@/features/events/hooks/useRatingLink';
import type { MovieData } from '@/shared/types/movie';

function movie(id: string, ratedBy: string[] = []): MovieData {
  return {
    id,
    eventId: 'evt1',
    participantId: 'p9',
    tmdbId: 1,
    mediaType: 'movie',
    title: id,
    year: '1999',
    posterPath: null,
    proposerPseudo: 'Zoé',
    score: 0,
    up: 0,
    down: 0,
    voteAverage: 8,
    runtimeMinutes: 100,
    ratings: ratedBy.map((participantId) => ({
      participantId,
      value: 8,
      updatedAt: '2026-09-20T10:00:00Z',
    })),
  };
}

describe('ratingLinkTarget', () => {
  it('names the first winner the participant has not rated', () => {
    const winners = [movie('m1', ['p1']), movie('m2', ['p2']), movie('m3')];
    expect(ratingLinkTarget(winners, 'p1', true)).toBe('m2');
  });

  it('names nothing once every winner carries my rating', () => {
    expect(
      ratingLinkTarget([movie('m1', ['p1']), movie('m2', ['p1', 'p2'])], 'p1', true)
    ).toBeNull();
  });

  it('names nothing for a visitor', () => {
    expect(ratingLinkTarget([movie('m1')], null, true)).toBeNull();
  });

  it('names nothing while the night is not over', () => {
    expect(ratingLinkTarget([movie('m1')], 'p1', false)).toBeNull();
  });

  it('names the requested winner when the participant has not rated it', () => {
    const winners = [movie('m1'), movie('m2')];
    expect(ratingLinkTarget(winners, 'p1', true, 'm2')).toBe('m2');
  });

  it('falls back to the first unrated winner when the requested one is rated or unknown', () => {
    const winners = [movie('m1'), movie('m2', ['p1'])];
    expect(ratingLinkTarget(winners, 'p1', true, 'm2')).toBe('m1');
    expect(ratingLinkTarget(winners, 'p1', true, 'nope')).toBe('m1');
  });
});

describe('useRatingLink', () => {
  function wrapperAt(search: string) {
    return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
      return <MemoryRouter initialEntries={[`/e/soiree${search}`]}>{children}</MemoryRouter>;
    };
  }

  function useLinkWithSearch(
    winners: MovieData[],
    participantId: string | null,
    isFinished: boolean
  ) {
    const link = useRatingLink(winners, participantId, isFinished);
    const { search } = useLocation();
    return { ...link, search };
  }

  it('points at the first unrated winner when the URL asks to rate', () => {
    const { result } = renderHook(
      () => useLinkWithSearch([movie('m1', ['p1']), movie('m2')], 'p1', true),
      {
        wrapper: wrapperAt('?rate'),
      }
    );

    expect(result.current.movieId).toBe('m2');
  });

  it('points at the winner named by the parameter', () => {
    const { result } = renderHook(() => useLinkWithSearch([movie('m1'), movie('m2')], 'p1', true), {
      wrapper: wrapperAt('?rate=m2'),
    });

    expect(result.current.movieId).toBe('m2');
  });

  it('stays quiet without the parameter', () => {
    const { result } = renderHook(() => useLinkWithSearch([movie('m1')], 'p1', true), {
      wrapper: wrapperAt(''),
    });

    expect(result.current.movieId).toBeNull();
  });

  it('drops the parameter from the URL once consumed, keeping the other ones', () => {
    const { result } = renderHook(() => useLinkWithSearch([movie('m1')], 'p1', true), {
      wrapper: wrapperAt('?host=abc&rate'),
    });
    expect(result.current.movieId).toBe('m1');

    act(() => result.current.consume());

    expect(result.current.search).toBe('?host=abc');
    expect(result.current.movieId).toBeNull();
  });

  it('drops the parameter when every winner is already rated, so clearing one later opens nothing', () => {
    const { result, rerender } = renderHook(
      ({ winners }: { winners: MovieData[] }) => useLinkWithSearch(winners, 'p1', true),
      {
        wrapper: wrapperAt('?tab=movies&rate'),
        initialProps: { winners: [movie('m1', ['p1'])] },
      }
    );

    expect(result.current.search).toBe('?tab=movies');

    rerender({ winners: [movie('m1')] });

    expect(result.current.movieId).toBeNull();
  });

  it('keeps the parameter while the winners are not known yet', () => {
    const { result } = renderHook(() => useLinkWithSearch([], 'p1', true), {
      wrapper: wrapperAt('?rate'),
    });

    expect(result.current.search).toBe('?rate');
  });

  it('keeps the parameter until the participant is known', () => {
    const { result } = renderHook(() => useLinkWithSearch([movie('m1', ['p1'])], null, true), {
      wrapper: wrapperAt('?rate'),
    });

    expect(result.current.search).toBe('?rate');
  });
});

function daysAgo(days: number): string {
  const day = new Date();
  day.setDate(day.getDate() - days);
  return [
    day.getFullYear(),
    String(day.getMonth() + 1).padStart(2, '0'),
    String(day.getDate()).padStart(2, '0'),
  ].join('-');
}

describe('isRecentNight', () => {
  it('counts a night of the last seven days as recent', () => {
    expect(isRecentNight(daysAgo(0))).toBe(true);
    expect(isRecentNight(daysAgo(1))).toBe(true);
    expect(isRecentNight(daysAgo(7))).toBe(true);
  });

  it('counts an older night, or one without a date, as past', () => {
    expect(isRecentNight(daysAgo(8))).toBe(false);
    expect(isRecentNight(undefined)).toBe(false);
  });
});

describe('useRatingLink, prompting once the night is over', () => {
  beforeEach(() => localStorage.removeItem('moviepicker_rating_prompted'));

  function visit(winners: MovieData[], participantId: string | null = 'p1', isFinished = true) {
    return renderHook(() => useRatingLink(winners, participantId, isFinished, true), {
      wrapper: function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
        return <MemoryRouter initialEntries={['/e/soiree']}>{children}</MemoryRouter>;
      },
    });
  }

  it('opens the first winner the participant has not rated, without any link', () => {
    const { result } = visit([movie('m1', ['p1']), movie('m2')]);

    expect(result.current.movieId).toBe('m2');
  });

  it('opens nothing more during the same visit once it has prompted', () => {
    const { result } = visit([movie('m1'), movie('m2')]);

    act(() => result.current.consume());

    expect(result.current.movieId).toBeNull();
  });

  it('never prompts twice for the same movie, moving on to the next one on a later visit', () => {
    const first = visit([movie('m1'), movie('m2')]);
    act(() => first.result.current.consume());
    first.unmount();

    const second = visit([movie('m1'), movie('m2')]);
    expect(second.result.current.movieId).toBe('m2');
    act(() => second.result.current.consume());
    second.unmount();

    expect(visit([movie('m1'), movie('m2')]).result.current.movieId).toBeNull();
  });

  it('counts a movie opened from the reminder link as already prompted', () => {
    const link = renderHook(() => useRatingLink([movie('m1')], 'p1', true, true), {
      wrapper: function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
        return <MemoryRouter initialEntries={['/e/soiree?rate']}>{children}</MemoryRouter>;
      },
    });
    act(() => link.result.current.consume());
    link.unmount();

    expect(visit([movie('m1')]).result.current.movieId).toBeNull();
  });

  it('opens nothing while the night is not over, or for a visitor', () => {
    expect(visit([movie('m1')], 'p1', false).result.current.movieId).toBeNull();
    expect(visit([movie('m1')], null).result.current.movieId).toBeNull();
  });
});
