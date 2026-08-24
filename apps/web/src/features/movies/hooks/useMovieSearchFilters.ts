import { useCallback, useMemo, useRef, useState } from 'react';
import { genreLabel } from '@/features/profile/lib/tmdbGenres';
import type { MovieSearchFilters } from '@/features/movies/api/moviesApi';
import type { RatingScale } from '@/shared/types/theme';
import {
  AVAILABILITY_OPTIONS,
  LANGUAGE_OPTIONS,
  RUNTIME_MAX_MINUTES,
  RUNTIME_MIN_MINUTES,
  VOTE_MIN_OPTIONS,
  localizedName,
  runtimeChipLabel,
  voteMinLabel,
} from '@/features/movies/components/movieSearchFilterOptions';

export interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

function collectSearchFilterChips(args: {
  selectedGenres: number[];
  tmdbLanguage: string;
  removeGenre: (id: number) => void;
  selectedDecade: string | undefined;
  setSelectedDecade: (value: string | undefined) => void;
  voteMin: number | undefined;
  setVoteMin: (value: number | undefined) => void;
  ratingScale?: RatingScale;
  selectedLanguage: string | undefined;
  setSelectedLanguage: (value: string | undefined) => void;
  availabilityFilter: string | undefined;
  setAvailabilityFilter: (value: string | undefined) => void;
  runtimeMin: number | undefined;
  runtimeMax: number | undefined;
  runtimeRange: [number, number];
  setRuntimeRange: (value: [number, number]) => void;
  markFilterChanged: () => void;
}): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  for (const id of args.selectedGenres) {
    chips.push({
      key: `g-${id}`,
      label: genreLabel(id, args.tmdbLanguage),
      onRemove: () => args.removeGenre(id),
    });
  }
  if (args.selectedDecade != null) {
    chips.push({
      key: 'decade',
      label: `${args.selectedDecade}s`,
      onRemove: () => {
        args.markFilterChanged();
        args.setSelectedDecade(undefined);
      },
    });
  }
  if (args.voteMin != null) {
    const voteOpt = VOTE_MIN_OPTIONS.find((o) => o.tmdb === args.voteMin);
    chips.push({
      key: 'vote',
      label: voteOpt ? `★ ${voteMinLabel(voteOpt.tmdb, args.ratingScale)}+` : `★ ${args.voteMin}+`,
      onRemove: () => {
        args.markFilterChanged();
        args.setVoteMin(undefined);
      },
    });
  }
  if (args.selectedLanguage != null) {
    const opt = LANGUAGE_OPTIONS.find((l) => l.code === args.selectedLanguage);
    const label = opt
      ? `${opt.code.toUpperCase()} ${localizedName(opt.fr, opt.en, args.tmdbLanguage)}`
      : args.selectedLanguage;
    chips.push({
      key: 'lang',
      label,
      onRemove: () => {
        args.markFilterChanged();
        args.setSelectedLanguage(undefined);
      },
    });
  }
  if (args.availabilityFilter != null) {
    const opt = AVAILABILITY_OPTIONS.find((o) => o.type === args.availabilityFilter);
    chips.push({
      key: 'avail',
      label: opt ? localizedName(opt.fr, opt.en, args.tmdbLanguage) : args.availabilityFilter,
      onRemove: () => args.setAvailabilityFilter(undefined),
    });
  }
  if (args.runtimeMin !== undefined || args.runtimeMax !== undefined) {
    chips.push({
      key: 'runtime',
      label: runtimeChipLabel(
        args.runtimeMin,
        args.runtimeMax,
        args.runtimeRange,
        args.tmdbLanguage
      ),
      onRemove: () => {
        args.markFilterChanged();
        args.setRuntimeRange([RUNTIME_MIN_MINUTES, RUNTIME_MAX_MINUTES]);
      },
    });
  }
  return chips;
}

export function useMovieSearchFilters(tmdbLanguage: string, ratingScale?: RatingScale) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedDecade, setSelectedDecade] = useState<string | undefined>(undefined);
  const [voteMin, setVoteMin] = useState<number | undefined>(undefined);
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined);
  const [availabilityFilter, setAvailabilityFilter] = useState<string | undefined>(undefined);
  const [runtimeRange, setRuntimeRange] = useState<[number, number]>([
    RUNTIME_MIN_MINUTES,
    RUNTIME_MAX_MINUTES,
  ]);

  const filterChangedRef = useRef(false);

  const yearFrom = selectedDecade ? Number.parseInt(selectedDecade, 10) : undefined;
  const yearTo = selectedDecade ? Number.parseInt(selectedDecade, 10) + 9 : undefined;
  const runtimeMin = runtimeRange[0] > RUNTIME_MIN_MINUTES ? runtimeRange[0] : undefined;
  const runtimeMax = runtimeRange[1] < RUNTIME_MAX_MINUTES ? runtimeRange[1] : undefined;

  const activeFilters: MovieSearchFilters = useMemo(
    () => ({
      genreIds: selectedGenres.length > 0 ? selectedGenres : undefined,
      yearFrom,
      yearTo,
      voteMin,
      originalLanguage: selectedLanguage,
      runtimeMin,
      runtimeMax,
    }),
    [selectedGenres, yearFrom, yearTo, voteMin, selectedLanguage, runtimeMin, runtimeMax]
  );

  const hasApiFilters = useMemo(
    () =>
      selectedGenres.length > 0 ||
      selectedDecade !== undefined ||
      voteMin !== undefined ||
      selectedLanguage !== undefined ||
      runtimeMin !== undefined ||
      runtimeMax !== undefined,
    [selectedGenres, selectedDecade, voteMin, selectedLanguage, runtimeMin, runtimeMax]
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

  const changeRuntimeRange = useCallback((min: number, max: number) => {
    filterChangedRef.current = true;
    setRuntimeRange([min, max]);
  }, []);

  const clearAllFilters = useCallback(() => {
    filterChangedRef.current = true;
    setSelectedGenres([]);
    setSelectedDecade(undefined);
    setVoteMin(undefined);
    setSelectedLanguage(undefined);
    setAvailabilityFilter(undefined);
    setRuntimeRange([RUNTIME_MIN_MINUTES, RUNTIME_MAX_MINUTES]);
  }, []);

  const removeGenre = useCallback((id: number) => {
    filterChangedRef.current = true;
    setSelectedGenres((prev) => prev.filter((g) => g !== id));
  }, []);

  const activeFilterChips = useMemo<ActiveFilterChip[]>(
    () =>
      collectSearchFilterChips({
        selectedGenres,
        tmdbLanguage,
        removeGenre,
        selectedDecade,
        setSelectedDecade,
        voteMin,
        setVoteMin,
        ratingScale,
        selectedLanguage,
        setSelectedLanguage,
        availabilityFilter,
        setAvailabilityFilter,
        runtimeMin,
        runtimeMax,
        runtimeRange,
        setRuntimeRange,
        markFilterChanged: () => {
          filterChangedRef.current = true;
        },
      }),
    [
      selectedGenres,
      selectedDecade,
      voteMin,
      selectedLanguage,
      availabilityFilter,
      runtimeMin,
      runtimeMax,
      runtimeRange,
      tmdbLanguage,
      ratingScale,
      removeGenre,
    ]
  );

  return {
    filtersOpen,
    setFiltersOpen,
    selectedGenres,
    selectedDecade,
    voteMin,
    selectedLanguage,
    availabilityFilter,
    runtimeRange,
    toggleGenre,
    toggleVoteMin,
    toggleDecade,
    toggleLanguage,
    toggleAvailability,
    changeRuntimeRange,
    clearAllFilters,
    activeFilters,
    hasApiFilters,
    activeFilterChips,
    filterChangedRef,
  };
}
