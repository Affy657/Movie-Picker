import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { ratingLinkTarget, useRatingLink } from '@/features/events/hooks/useRatingLink';
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
});
