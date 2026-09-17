import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWatchlistToolbar, type WatchlistEntry } from './useWatchlistToolbar';
import type { WatchlistItem } from '@/features/watchlist/api/watchlistApi';

const MEDIA_TYPE_LABELS = { movie: 'Films', tv: 'Séries' };

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

function setup(items: WatchlistEntry[] = ITEMS) {
  return renderHook(() =>
    useWatchlistToolbar({
      items,
      userId: 'u1',
      tmdbLanguage: 'fr',
      ratingScale: 'ten',
      mediaTypeLabels: MEDIA_TYPE_LABELS,
    })
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('useWatchlistToolbar', () => {
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

  it('filters by genre while tolerating items without a genre', () => {
    const { result } = setup();
    act(() => result.current.toggleGenre(12));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Alpha']);
  });

  it('ne borne pas la duree maximum quand seul le minimum est touche', () => {
    const { result } = setup();
    act(() => result.current.changeRuntimeRange(5, 180));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Beta', 'Gamma', 'Alpha']);
    const chip = result.current.activeFilterChips.find((c) => c.key === 'runtime');
    expect(chip?.label).toBe('5min ou plus');
  });

  it('ne borne pas la duree minimum quand seul le maximum est touche', () => {
    const { result } = setup();
    act(() => result.current.changeRuntimeRange(0, 90));
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
});
