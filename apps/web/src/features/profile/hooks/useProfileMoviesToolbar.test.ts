import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileMoviesToolbar } from './useProfileMoviesToolbar';
import type { UserMovieItem } from '@/features/profile/api/profileApi';

const MEDIA_TYPE_LABELS = { movie: 'Films', tv: 'Séries' };

function item(overrides: Partial<UserMovieItem>): UserMovieItem {
  return {
    title: 'Titre',
    year: '2020',
    posterPath: null,
    genreIds: [],
    mediaType: 'movie',
    proposedAt: '2026-01-01T00:00:00Z',
    isWinner: false,
    ...overrides,
  };
}

const ITEMS: UserMovieItem[] = [
  item({ title: 'Alpha', year: '1990', proposedAt: '2026-01-01T00:00:00Z', genreIds: [12] }),
  item({
    title: 'Beta',
    year: '2020',
    proposedAt: '2026-03-01T00:00:00Z',
    mediaType: 'tv',
    isWinner: true,
  }),
  item({ title: 'Gamma', year: '2010', proposedAt: '2026-02-01T00:00:00Z' }),
];

function setup(items: UserMovieItem[] = ITEMS) {
  return renderHook(() =>
    useProfileMoviesToolbar({ items, tmdbLanguage: 'fr', mediaTypeLabels: MEDIA_TYPE_LABELS })
  );
}

describe('useProfileMoviesToolbar', () => {
  it('trie par date de proposition (défaut, décroissant)', () => {
    const { result } = setup();
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Beta', 'Gamma', 'Alpha']);
  });

  it('inverse le sens quand on reclique le même critère', () => {
    const { result } = setup();
    act(() => result.current.setSortBy('title'));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Alpha', 'Beta', 'Gamma']);

    act(() => result.current.setSortBy('title'));
    expect(result.current.sortDir).toBe('desc');
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Gamma', 'Beta', 'Alpha']);
  });

  it('trie par année', () => {
    const { result } = setup();
    act(() => result.current.setSortBy('year'));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Beta', 'Gamma', 'Alpha']);
  });

  it('filtre par genre en tolérant les items sans genre', () => {
    const { result } = setup();
    act(() => result.current.toggleGenre(12));
    expect(result.current.visibleItems.map((i) => i.title)).toEqual(['Alpha']);
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

  it('révèle progressivement les résultats au-delà du lot initial', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      item({
        title: `Film ${i}`,
        proposedAt: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
      })
    );
    const { result } = setup(many);
    expect(result.current.revealedItems).toHaveLength(24);
    expect(result.current.remainingCount).toBe(6);

    act(() => result.current.revealMore());
    expect(result.current.revealedItems).toHaveLength(30);
    expect(result.current.remainingCount).toBe(0);
  });

  it('remet le lot révélé à zéro quand la recherche change', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      item({
        title: `Film ${i}`,
        proposedAt: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
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
