import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMovieSearchFilters } from './useMovieSearchFilters';

describe('useMovieSearchFilters', () => {
  it('demarre sans filtre actif', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    expect(result.current.filtersOpen).toBe(false);
    expect(result.current.selectedGenres).toEqual([]);
    expect(result.current.selectedDecade).toBeUndefined();
    expect(result.current.voteMin).toBeUndefined();
    expect(result.current.selectedLanguage).toBeUndefined();
    expect(result.current.availabilityFilter).toBeUndefined();
    expect(result.current.runtimeRange).toEqual([10, 180]);
    expect(result.current.hasApiFilters).toBe(false);
    expect(result.current.activeFilterChips).toEqual([]);
    expect(result.current.activeFilters).toEqual({
      genreIds: undefined,
      yearFrom: undefined,
      yearTo: undefined,
      voteMin: undefined,
      originalLanguage: undefined,
      runtimeMin: undefined,
      runtimeMax: undefined,
    });
    expect(result.current.filterChangedRef.current).toBe(false);
  });

  it('toggleGenre ajoute puis retire un genre', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => result.current.toggleGenre(28));
    expect(result.current.selectedGenres).toEqual([28]);
    expect(result.current.hasApiFilters).toBe(true);
    expect(result.current.activeFilters.genreIds).toEqual([28]);
    expect(result.current.filterChangedRef.current).toBe(true);
    act(() => result.current.toggleGenre(28));
    expect(result.current.selectedGenres).toEqual([]);
    expect(result.current.activeFilters.genreIds).toBeUndefined();
  });

  it('toggleGenre cumule plusieurs genres', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => {
      result.current.toggleGenre(28);
      result.current.toggleGenre(35);
    });
    expect(result.current.selectedGenres).toEqual([28, 35]);
  });

  it('toggleDecade calcule yearFrom/yearTo et bascule', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => result.current.toggleDecade('2010'));
    expect(result.current.selectedDecade).toBe('2010');
    expect(result.current.activeFilters.yearFrom).toBe(2010);
    expect(result.current.activeFilters.yearTo).toBe(2019);
    act(() => result.current.toggleDecade('2010'));
    expect(result.current.selectedDecade).toBeUndefined();
    expect(result.current.activeFilters.yearFrom).toBeUndefined();
    expect(result.current.activeFilters.yearTo).toBeUndefined();
  });

  it('toggleVoteMin bascule la note minimale', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => result.current.toggleVoteMin(8));
    expect(result.current.voteMin).toBe(8);
    expect(result.current.activeFilters.voteMin).toBe(8);
    act(() => result.current.toggleVoteMin(8));
    expect(result.current.voteMin).toBeUndefined();
  });

  it('toggleLanguage bascule la langue', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => result.current.toggleLanguage('fr'));
    expect(result.current.selectedLanguage).toBe('fr');
    expect(result.current.activeFilters.originalLanguage).toBe('fr');
    act(() => result.current.toggleLanguage('fr'));
    expect(result.current.selectedLanguage).toBeUndefined();
  });

  it("toggleAvailability n'affecte ni les filtres API ni le drapeau de changement", () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => result.current.toggleAvailability('flatrate'));
    expect(result.current.availabilityFilter).toBe('flatrate');
    expect(result.current.hasApiFilters).toBe(false);
    expect(result.current.filterChangedRef.current).toBe(false);
    act(() => result.current.toggleAvailability('flatrate'));
    expect(result.current.availabilityFilter).toBeUndefined();
  });

  it('clearAllFilters remet tout a zero', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => {
      result.current.toggleGenre(28);
      result.current.toggleDecade('2000');
      result.current.toggleVoteMin(7);
      result.current.toggleLanguage('en');
      result.current.toggleAvailability('rent');
      result.current.changeRuntimeRange(30, 90);
    });
    act(() => result.current.clearAllFilters());
    expect(result.current.selectedGenres).toEqual([]);
    expect(result.current.selectedDecade).toBeUndefined();
    expect(result.current.voteMin).toBeUndefined();
    expect(result.current.selectedLanguage).toBeUndefined();
    expect(result.current.availabilityFilter).toBeUndefined();
    expect(result.current.runtimeRange).toEqual([10, 180]);
    expect(result.current.hasApiFilters).toBe(false);
  });

  it('changeRuntimeRange met a jour la plage et expose runtimeMin/runtimeMax', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => result.current.changeRuntimeRange(30, 90));
    expect(result.current.runtimeRange).toEqual([30, 90]);
    expect(result.current.activeFilters.runtimeMin).toBe(30);
    expect(result.current.activeFilters.runtimeMax).toBe(90);
    expect(result.current.hasApiFilters).toBe(true);
    expect(result.current.filterChangedRef.current).toBe(true);
  });

  it('changeRuntimeRange aux bornes ne produit aucun filtre actif', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => result.current.changeRuntimeRange(10, 180));
    expect(result.current.activeFilters.runtimeMin).toBeUndefined();
    expect(result.current.activeFilters.runtimeMax).toBeUndefined();
    expect(result.current.hasApiFilters).toBe(false);
  });

  it('chip duree : onRemove reinitialise la plage', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => result.current.changeRuntimeRange(60, 120));
    const chip = result.current.activeFilterChips.find((c) => c.key === 'runtime')!;
    expect(chip.label).toBe('1h - 2h');
    act(() => chip.onRemove());
    expect(result.current.runtimeRange).toEqual([10, 180]);
    expect(result.current.activeFilters.runtimeMin).toBeUndefined();
  });

  it('construit les chips actifs avec les bons libelles (fr)', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => {
      result.current.toggleGenre(28);
      result.current.toggleDecade('1990');
      result.current.toggleVoteMin(8);
      result.current.toggleLanguage('fr');
      result.current.toggleAvailability('flatrate');
    });
    const labels = result.current.activeFilterChips.map((c) => c.label);
    expect(labels).toEqual(['Action', '1990s', '★ 4+', 'FR Français', 'Streaming']);
  });

  it('chip genre : onRemove retire le genre', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => result.current.toggleGenre(28));
    const chip = result.current.activeFilterChips.find((c) => c.key === 'g-28')!;
    act(() => chip.onRemove());
    expect(result.current.selectedGenres).toEqual([]);
  });

  it('chip decennie/vote/langue : onRemove reinitialise et marque le changement', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => {
      result.current.toggleDecade('2020');
      result.current.toggleVoteMin(6);
      result.current.toggleLanguage('en');
    });
    result.current.filterChangedRef.current = false;
    act(() => result.current.activeFilterChips.find((c) => c.key === 'decade')!.onRemove());
    expect(result.current.selectedDecade).toBeUndefined();
    expect(result.current.filterChangedRef.current).toBe(true);
    act(() => result.current.activeFilterChips.find((c) => c.key === 'vote')!.onRemove());
    expect(result.current.voteMin).toBeUndefined();
    act(() => result.current.activeFilterChips.find((c) => c.key === 'lang')!.onRemove());
    expect(result.current.selectedLanguage).toBeUndefined();
  });

  it('chip disponibilite : onRemove ne marque pas le changement', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => result.current.toggleAvailability('buy'));
    result.current.filterChangedRef.current = false;
    const chip = result.current.activeFilterChips.find((c) => c.key === 'avail')!;
    expect(chip.label).toBe('Achat');
    act(() => chip.onRemove());
    expect(result.current.availabilityFilter).toBeUndefined();
    expect(result.current.filterChangedRef.current).toBe(false);
  });

  it('libelles de repli quand la valeur est hors options', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => {
      result.current.toggleVoteMin(99);
      result.current.toggleLanguage('xx');
      result.current.toggleAvailability('unknown');
    });
    const byKey = Object.fromEntries(result.current.activeFilterChips.map((c) => [c.key, c.label]));
    expect(byKey.vote).toBe('★ 99+');
    expect(byKey.lang).toBe('xx');
    expect(byKey.avail).toBe('unknown');
  });

  it('libelles en anglais', () => {
    const { result } = renderHook(() => useMovieSearchFilters('en'));
    act(() => {
      result.current.toggleGenre(878);
      result.current.toggleLanguage('fr');
      result.current.toggleAvailability('rent');
    });
    const byKey = Object.fromEntries(result.current.activeFilterChips.map((c) => [c.key, c.label]));
    expect(byKey['g-878']).toBe('Science Fiction');
    expect(byKey.lang).toBe('FR French');
    expect(byKey.avail).toBe('Rental');
  });

  it('setFiltersOpen ouvre le panneau', () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr'));
    act(() => result.current.setFiltersOpen(true));
    expect(result.current.filtersOpen).toBe(true);
  });

  it("avec ratingScale='ten', le chip de note minimale affiche la valeur TMDB brute", () => {
    const { result } = renderHook(() => useMovieSearchFilters('fr', 'ten'));
    act(() => result.current.toggleVoteMin(8));
    const chip = result.current.activeFilterChips.find((c) => c.key === 'vote')!;
    expect(chip.label).toBe('★ 8+');
  });
});
