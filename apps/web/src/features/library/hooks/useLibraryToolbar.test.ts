import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { renderHook, act } from '@testing-library/react';
import { useLibraryToolbar, type LibraryEntry } from './useLibraryToolbar';
import type { WatchlistItem } from '@/features/movies/api/watchlistApi';

const MEDIA_TYPE_LABELS = { movie: 'Films', tv: 'Séries' };

function inRouter({ children }: Readonly<{ children: ReactNode }>) {
  return createElement(MemoryRouter, null, children);
}

function item(overrides: Partial<WatchlistItem>): WatchlistItem {
  return {
    tmdbId: 1,
    mediaType: 'movie',
    title: 'Titre',
    year: '2020',
    posterPath: null,
    voteAverage: 5,
    runtimeMinutes: 100,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const ITEMS: WatchlistItem[] = [
  item({
    tmdbId: 1,
    title: 'Alpha',
    year: '1990',
    voteAverage: 9,
    runtimeMinutes: 80,
    genreIds: [12],
  }),
  item({
    tmdbId: 2,
    title: 'Beta',
    year: '2020',
    voteAverage: 3,
    runtimeMinutes: 150,
    mediaType: 'tv',
    createdAt: '2026-02-01T00:00:00Z',
  }),
  item({ tmdbId: 3, title: 'Gamma', year: '2010', voteAverage: 6, runtimeMinutes: 100 }),
];

function setup(items: LibraryEntry[] = ITEMS) {
  return renderHook(
    () =>
      useLibraryToolbar({
        items,
        userId: 'u1',
        tmdbLanguage: 'fr',
        ratingScale: 'ten',
        mediaTypeLabels: MEDIA_TYPE_LABELS,
      }),
    { wrapper: inRouter }
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('useLibraryToolbar', () => {
  it('sorts by addition (default, descending)', () => {
    const { result } = setup();
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Beta', 'Gamma', 'Alpha']);
  });

  it('reverses the direction when clicking the same criterion again', () => {
    const { result } = setup();
    act(() => result.current.setSortBy('voteAverage'));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Alpha', 'Gamma', 'Beta']);

    act(() => result.current.setSortBy('voteAverage'));
    expect(result.current.sortDir).toBe('asc');
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Beta', 'Gamma', 'Alpha']);
  });

  it('sorts by release year, most recent first, then oldest first', () => {
    const { result } = setup();
    act(() => result.current.setSortBy('year'));
    expect(result.current.sortDir).toBe('desc');
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Beta', 'Gamma', 'Alpha']);

    act(() => result.current.setSortBy('year'));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Alpha', 'Gamma', 'Beta']);
  });

  it('sorts by availability, the most offers first, tolerating items without any', () => {
    const offer = { providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' };
    const { result } = setup([
      { ...item({ tmdbId: 1, title: 'Alpha' }), watchProviders: [offer] },
      item({ tmdbId: 2, title: 'Beta' }),
      {
        ...item({ tmdbId: 3, title: 'Gamma' }),
        watchProviders: [offer, { ...offer, providerId: 9, type: 'rent' }],
      },
    ]);
    act(() => result.current.setSortBy('availability'));
    expect(result.current.sortDir).toBe('desc');
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Gamma', 'Alpha', 'Beta']);
  });

  it('keeps the order of the source by relevance, the default of a saved list, and reverses it on demand', () => {
    const { result } = renderHook(
      () =>
        useLibraryToolbar({
          items: ITEMS,
          userId: 'u1',
          tmdbLanguage: 'fr',
          mediaTypeLabels: MEDIA_TYPE_LABELS,
          storageScope: 'savedList',
          defaultSortBy: 'relevance',
        }),
      { wrapper: inRouter }
    );

    expect(result.current.sortBy).toBe('relevance');
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Alpha', 'Beta', 'Gamma']);

    act(() => result.current.setSortBy('relevance'));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Gamma', 'Beta', 'Alpha']);

    expect(setup().result.current.sortBy).toBe('createdAt');
  });

  it('filters by genre while tolerating items without a genre', () => {
    const { result } = setup();
    act(() => result.current.toggleGenre(12));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Alpha']);
  });

  it('matches a series on the film genre chip its TV genre stands for', () => {
    const { result } = setup([
      item({ tmdbId: 1, title: 'Série Action', mediaType: 'tv', genreIds: [10759] }),
      item({ tmdbId: 2, title: 'Série SF', mediaType: 'tv', genreIds: [10765] }),
      item({ tmdbId: 3, title: 'Série Guerre', mediaType: 'tv', genreIds: [10768] }),
      item({ tmdbId: 4, title: 'Film Comédie', genreIds: [35] }),
    ]);
    act(() => result.current.toggleGenre(12));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Série Action']);
    act(() => {
      result.current.toggleGenre(12);
      result.current.toggleGenre(14);
    });
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Série SF']);
    act(() => {
      result.current.toggleGenre(14);
      result.current.toggleGenre(10752);
    });
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Série Guerre']);
  });

  it('ne borne pas la duree maximum quand seul le minimum est touche', () => {
    const { result } = setup();
    act(() => result.current.changeRuntimeRange?.(5, 180));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Beta', 'Gamma', 'Alpha']);
    const chip = result.current.activeFilterChips.find((c) => c.key === 'runtime');
    expect(chip?.label).toBe('5min ou plus');
  });

  it('ne borne pas la duree minimum quand seul le maximum est touche', () => {
    const { result } = setup();
    act(() => result.current.changeRuntimeRange?.(0, 90));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Alpha']);
    const chip = result.current.activeFilterChips.find((c) => c.key === 'runtime');
    expect(chip?.label).toBe('1h30 ou moins');
  });

  it('filtre par type de contenu', () => {
    const { result } = setup();
    act(() => result.current.toggleMediaType('tv'));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Beta']);
  });

  it('filtre par recherche sur le titre', () => {
    const { result } = setup();
    act(() => result.current.setSearch('gam'));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Gamma']);
    expect(result.current.isFiltered).toBe(true);
  });

  it('resetAll efface la recherche et les filtres', () => {
    const { result } = setup();
    act(() => {
      result.current.setSearch('gam');
      result.current.toggleMediaType('tv');
    });
    expect(result.current.visibleItems).toHaveLength(0);

    act(() => result.current.resetAll());
    expect(result.current.search).toBe('');
    expect(result.current.isFiltered).toBe(false);
    expect(result.current.visibleItems).toHaveLength(3);
  });

  it('persiste le tri et les filtres par utilisateur', () => {
    const first = setup();
    act(() => {
      first.result.current.setSortBy('title');
      first.result.current.toggleGenre(12);
    });

    const second = setup();
    expect(second.result.current.sortBy).toBe('title');
    expect(second.result.current.selectedGenres).toEqual([12]);
  });

  it('keeps the sort and filters of the created lists apart from the watchlist ones', () => {
    const watchlist = setup();
    act(() => watchlist.result.current.setSortBy('title'));

    const createdList = renderHook(
      () =>
        useLibraryToolbar({
          items: ITEMS,
          userId: 'u1',
          tmdbLanguage: 'fr',
          mediaTypeLabels: MEDIA_TYPE_LABELS,
          storageScope: 'list',
        }),
      { wrapper: inRouter }
    );
    expect(createdList.result.current.sortBy).toBe('createdAt');
    act(() => createdList.result.current.setSortBy('duration'));

    expect(setup().result.current.sortBy).toBe('title');
  });

  it.each(['list', 'savedList', 'publicList'] as const)(
    'keeps the sort and filters of each %s apart from the other lists of that kind',
    (storageScope) => {
      const renderList = (storageListId: string) =>
        renderHook(
          () =>
            useLibraryToolbar({
              items: ITEMS,
              userId: 'u1',
              tmdbLanguage: 'fr',
              mediaTypeLabels: MEDIA_TYPE_LABELS,
              storageScope,
              storageListId,
            }),
          { wrapper: inRouter }
        );
      const first = renderList('l1');
      act(() => {
        first.result.current.setSortBy('title');
        first.result.current.toggleGenre(12);
      });

      const second = renderList('l2');

      expect(second.result.current.sortBy).toBe('createdAt');
      expect(second.result.current.selectedGenres).toEqual([]);
      expect(renderList('l1').result.current.selectedGenres).toEqual([12]);
    }
  );

  it('narrows the films by an extra filter, counted as a filter and reset with the others', () => {
    let onlyMovies = true;
    let resets = 0;
    const { result, rerender } = renderHook(
      () =>
        useLibraryToolbar({
          items: ITEMS,
          userId: 'u1',
          tmdbLanguage: 'fr',
          mediaTypeLabels: MEDIA_TYPE_LABELS,
          storageScope: 'watched',
          extraFilter: {
            matches: (entry) => !onlyMovies || entry.mediaType === 'movie',
            active: onlyMovies,
            reset: () => {
              resets += 1;
            },
          },
        }),
      { wrapper: inRouter }
    );

    expect(result.current.visibleItems.map((entry) => entry.title)).toEqual(['Gamma', 'Alpha']);
    expect(result.current.isFiltered).toBe(true);

    act(() => result.current.resetAll());
    expect(resets).toBe(1);

    onlyMovies = false;
    rerender();
    expect(result.current.visibleCount).toBe(3);
    expect(result.current.isFiltered).toBe(false);
  });
});
