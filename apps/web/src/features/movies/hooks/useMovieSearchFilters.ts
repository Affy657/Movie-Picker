import { useCallback, useMemo, useRef, useState } from 'react';
import { genreLabel } from '@/features/profile/lib/tmdbGenres';
import type { MovieSearchFilters } from '@/features/movies/api/moviesApi';
import type { RatingScale } from '@/shared/types/theme';
import {
  AVAILABILITY_OPTIONS,
  LANGUAGE_OPTIONS,
  VOTE_MIN_OPTIONS,
  localizedName,
  voteMinLabel,
} from '@/features/movies/components/movieSearchFilterOptions';

export interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export function useMovieSearchFilters(tmdbLanguage: string, ratingScale?: RatingScale) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedDecade, setSelectedDecade] = useState<string | undefined>(undefined);
  const [voteMin, setVoteMin] = useState<number | undefined>(undefined);
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined);
  const [availabilityFilter, setAvailabilityFilter] = useState<string | undefined>(undefined);

  const filterChangedRef = useRef(false);

  const yearFrom = selectedDecade ? Number.parseInt(selectedDecade, 10) : undefined;
  const yearTo = selectedDecade ? Number.parseInt(selectedDecade, 10) + 9 : undefined;

  const activeFilters: MovieSearchFilters = useMemo(
    () => ({
      genreIds: selectedGenres.length > 0 ? selectedGenres : undefined,
      yearFrom,
      yearTo,
      voteMin,
      originalLanguage: selectedLanguage,
    }),
    [selectedGenres, yearFrom, yearTo, voteMin, selectedLanguage]
  );

  const hasApiFilters = useMemo(
    () =>
      selectedGenres.length > 0 ||
      selectedDecade !== undefined ||
      voteMin !== undefined ||
      selectedLanguage !== undefined,
    [selectedGenres, selectedDecade, voteMin, selectedLanguage]
  );

  const toggleGenre = useCallback((id: number) => {
    filterChangedRef.current = true;
    setSelectedGenres((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }, []);

  const toggleVoteMin = useCallback((min: number) => {
    filterChangedRef.current = true;
    setVoteMin((prev) => (prev === min ? undefined : min));
  }, []);

  const toggleDecade = useCallback((decade: string) => {
    filterChangedRef.current = true;
    setSelectedDecade((prev) => (prev === decade ? undefined : decade));
  }, []);

  const toggleLanguage = useCallback((code: string) => {
    filterChangedRef.current = true;
    setSelectedLanguage((prev) => (prev === code ? undefined : code));
  }, []);

  const toggleAvailability = useCallback((type: string) => {
    setAvailabilityFilter((prev) => (prev === type ? undefined : type));
  }, []);

  const clearAllFilters = useCallback(() => {
    filterChangedRef.current = true;
    setSelectedGenres([]);
    setSelectedDecade(undefined);
    setVoteMin(undefined);
    setSelectedLanguage(undefined);
    setAvailabilityFilter(undefined);
  }, []);

  const removeGenre = useCallback((id: number) => {
    filterChangedRef.current = true;
    setSelectedGenres((prev) => prev.filter((g) => g !== id));
  }, []);

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    for (const id of selectedGenres) {
      chips.push({
        key: `g-${id}`,
        label: genreLabel(id, tmdbLanguage),
        onRemove: () => removeGenre(id),
      });
    }
    if (selectedDecade != null) {
      chips.push({
        key: 'decade',
        label: `${selectedDecade}s`,
        onRemove: () => {
          filterChangedRef.current = true;
          setSelectedDecade(undefined);
        },
      });
    }
    if (voteMin != null) {
      const voteOpt = VOTE_MIN_OPTIONS.find((o) => o.tmdb === voteMin);
      chips.push({
        key: 'vote',
        label: voteOpt ? `★ ${voteMinLabel(voteOpt.tmdb, ratingScale)}+` : `★ ${voteMin}+`,
        onRemove: () => {
          filterChangedRef.current = true;
          setVoteMin(undefined);
        },
      });
    }
    if (selectedLanguage != null) {
      const opt = LANGUAGE_OPTIONS.find((l) => l.code === selectedLanguage);
      const label = opt
        ? `${opt.code.toUpperCase()} ${localizedName(opt.fr, opt.en, tmdbLanguage)}`
        : selectedLanguage;
      chips.push({
        key: 'lang',
        label,
        onRemove: () => {
          filterChangedRef.current = true;
          setSelectedLanguage(undefined);
        },
      });
    }
    if (availabilityFilter != null) {
      const opt = AVAILABILITY_OPTIONS.find((o) => o.type === availabilityFilter);
      chips.push({
        key: 'avail',
        label: opt ? localizedName(opt.fr, opt.en, tmdbLanguage) : availabilityFilter,
        onRemove: () => setAvailabilityFilter(undefined),
      });
    }
    return chips;
  }, [
    selectedGenres,
    selectedDecade,
    voteMin,
    selectedLanguage,
    availabilityFilter,
    tmdbLanguage,
    ratingScale,
    removeGenre,
  ]);

  return {
    filtersOpen,
    setFiltersOpen,
    selectedGenres,
    selectedDecade,
    voteMin,
    selectedLanguage,
    availabilityFilter,
    toggleGenre,
    toggleVoteMin,
    toggleDecade,
    toggleLanguage,
    toggleAvailability,
    clearAllFilters,
    activeFilters,
    hasApiFilters,
    activeFilterChips,
    filterChangedRef,
  };
}
