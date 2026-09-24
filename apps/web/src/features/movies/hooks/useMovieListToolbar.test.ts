import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMovieListToolbar, type MovieListItemLike } from './useMovieListToolbar';

type WatchedItem = MovieListItemLike & { watchedAt: string };

const MEDIA_TYPE_LABELS = { movie: 'Films', tv: 'Séries' };

function compareWatchedAt(a: WatchedItem, b: WatchedItem) {
  return a.watchedAt.localeCompare(b.watchedAt);
}

function item(overrides: Partial<WatchedItem>): WatchedItem {
  return {
    tmdbId: 1,
    title: 'Titre',
    year: '2020',
    posterPath: null,
    genreIds: [],
    mediaType: 'movie',
    watchedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const ITEMS: WatchedItem[] = [
  item({ title: 'Alpha', year: '1990', watchedAt: '2026-01-01T00:00:00Z', genreIds: [12] }),
  item({
    title: 'Beta',
    year: '2020',
    watchedAt: '2026-03-01T00:00:00Z',
    mediaType: 'tv',
  }),
  item({ title: 'Gamma', year: '2010', watchedAt: '2026-02-01T00:00:00Z' }),
];

const OPTIONS = {
  tmdbLanguage: 'fr',
  mediaTypeLabels: MEDIA_TYPE_LABELS,
  comparePrimary: compareWatchedAt,
};

function setup(items: WatchedItem[] = ITEMS) {
  return renderHook(() => useMovieListToolbar({ items, ...OPTIONS }));
}

function setupStrict(items: WatchedItem[] = ITEMS) {
  return renderHook(() => useMovieListToolbar({ items, ...OPTIONS }), { wrapper: StrictMode });
}

describe('useMovieListToolbar', () => {
  it('sorts by watch date (default, descending)', () => {
    const { result } = setup();
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Beta', 'Gamma', 'Alpha']);
  });

  it('reverses the direction when clicking the same criterion again', () => {
    const { result } = setup();
    act(() => result.current.setSortBy('title'));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Alpha', 'Beta', 'Gamma']);

    act(() => result.current.setSortBy('title'));
    expect(result.current.sortDir).toBe('desc');
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Gamma', 'Beta', 'Alpha']);
  });

  it('inverse le sens sous StrictMode (non-regression double-invocation)', () => {
    const { result } = setupStrict();
    act(() => result.current.setSortBy('title'));
    expect(result.current.sortDir).toBe('asc');

    act(() => result.current.setSortBy('title'));
    expect(result.current.sortDir).toBe('desc');
  });

  it('sorts by year', () => {
    const { result } = setup();
    act(() => result.current.setSortBy('year'));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Beta', 'Gamma', 'Alpha']);
  });

  it('filters by genre while tolerating items without a genre', () => {
    const { result } = setup();
    act(() => result.current.toggleGenre(12));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Alpha']);
  });

  it('matches a series on the film genre chip its TV genre stands for', () => {
    const { result } = setup([
      item({ title: 'Série Action', mediaType: 'tv', genreIds: [10759] }),
      item({ title: 'Série SF', mediaType: 'tv', genreIds: [10765] }),
      item({ title: 'Série Guerre', mediaType: 'tv', genreIds: [10768] }),
      item({ title: 'Film Comédie', genreIds: [35] }),
    ]);
    act(() => result.current.toggleGenre(28));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Série Action']);
    act(() => {
      result.current.toggleGenre(28);
      result.current.toggleGenre(878);
    });
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Série SF']);
    act(() => {
      result.current.toggleGenre(878);
      result.current.toggleGenre(10752);
    });
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Série Guerre']);
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

  it('reveals the results progressively beyond the initial batch', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      item({
        title: `Film ${i}`,
        watchedAt: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
      })
    );
    const { result } = setup(many);
    expect(result.current.revealedItems).toHaveLength(24);
    expect(result.current.remainingCount).toBe(6);

    act(() => result.current.revealMore());
    expect(result.current.revealedItems).toHaveLength(30);
    expect(result.current.remainingCount).toBe(0);
  });

  it('resets the revealed batch when the search changes', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      item({
        title: `Film ${i}`,
        watchedAt: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
      })
    );
    const { result } = setup(many);
    act(() => result.current.revealMore());
    expect(result.current.remainingCount).toBe(0);

    act(() => result.current.setSearch('Film 1'));
    expect(result.current.remainingCount).toBe(0);
    expect(result.current.revealedItems.length).toBeLessThanOrEqual(24);
  });
});
