import { useMemo, useRef, type ReactNode } from 'react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { MovieMediaType } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import type { ActiveToolbarChip } from '@/features/movies/hooks/useCollectionToolbar';
import ActiveFilterChips from './ActiveFilterChips';
import FilteredCollectionLayout, {
  FilterSheet,
  FilteredEmptyState,
} from './FilteredCollectionLayout';
import { filtersToggleFor } from './ListToolbar';
import MovieListFiltersPanel from './MovieListFiltersPanel';

export interface MovieListFilters {
  filtersOpen: boolean;
  setFiltersOpen: (value: boolean | ((open: boolean) => boolean)) => void;
  selectedGenres: number[];
  toggleGenre: (id: number) => void;
  selectedMediaTypes: MovieMediaType[];
  toggleMediaType: (mediaType: MovieMediaType) => void;
  selectedDecade: string | undefined;
  toggleDecade: (decade: string) => void;
  voteMin?: number;
  toggleVoteMin?: (min: number) => void;
  runtimeRange?: [number, number];
  changeRuntimeRange?: (min: number, max: number) => void;
  clearAllFilters: () => void;
  resetAll: () => void;
  activeFilterChips: ActiveToolbarChip[];
  visibleCount: number;
}

export type MovieListFilterTexts = 'library' | 'catalog';

const TEXT_KEYS = {
  library: {
    resetAll: 'watchlist.toolbar.filtersResetAll',
    removeFilterAria: 'watchlist.toolbar.removeFilterAria',
    sheetTitle: 'watchlist.toolbar.filtersSheetTitle',
    sheetReset: 'watchlist.toolbar.filtersReset',
    applyOne: 'watchlist.toolbar.filtersApplyOne',
    apply: 'watchlist.toolbar.filtersApply',
    emptyTitle: 'watchlist.toolbar.emptyTitle',
    emptyMessage: 'watchlist.toolbar.emptyMessage',
  },
  catalog: {
    resetAll: 'profile.movies.toolbar.filtersResetAll',
    removeFilterAria: 'profile.movies.toolbar.removeFilterAria',
    sheetTitle: 'profile.movies.toolbar.filtersSheetTitle',
    sheetReset: 'profile.movies.toolbar.filtersReset',
    applyOne: 'profile.movies.toolbar.filtersApplyOne',
    apply: 'profile.movies.toolbar.filtersApply',
    emptyTitle: 'profile.movies.toolbar.emptyTitle',
    emptyMessage: 'profile.movies.toolbar.emptyMessage',
  },
} satisfies Record<MovieListFilterTexts, Record<string, TranslationKey>>;

interface MovieListFilteredLayoutProps {
  toolbar: ReactNode;
  filters: MovieListFilters;
  filtersPanelId: string;
  tmdbLanguage: string;
  ratingScale?: RatingScale;
  isMobile: boolean;
  texts?: MovieListFilterTexts;
  children: ReactNode;
}

export default function MovieListFilteredLayout({
  toolbar,
  filters,
  filtersPanelId,
  tmdbLanguage,
  ratingScale,
  isMobile,
  texts = 'catalog',
  children,
}: Readonly<MovieListFilteredLayoutProps>) {
  const { t } = useTranslation();
  const keys = TEXT_KEYS[texts];
  const panelRef = useRef<HTMLDivElement>(null);
  const filtersToggle = useMemo(() => filtersToggleFor(filtersPanelId), [filtersPanelId]);
  const desktopPanelOpen = filters.filtersOpen && !isMobile;
  useClickOutside(panelRef, () => filters.setFiltersOpen(false), desktopPanelOpen, {
    ignoreSelector: '[data-filters-toggle]',
    returnFocusTo: filtersToggle,
  });

  const labels = useMemo(
    () => ({
      genre: t('watchlist.toolbar.filterGenre'),
      type: t('watchlist.toolbar.filterType'),
      typeMovie: t('watchlist.toolbar.filterTypeMovie'),
      typeTv: t('watchlist.toolbar.filterTypeTv'),
      decade: t('watchlist.toolbar.filterDecade'),
      voteMin: t('watchlist.toolbar.filterVoteMin'),
      duration: t('watchlist.toolbar.filterDuration'),
      durationMinAria: t('movies.search.durationMinAria'),
      durationMaxAria: t('movies.search.durationMaxAria'),
      resetAll: t(keys.resetAll),
    }),
    [t, keys]
  );

  const panel = (
    <MovieListFiltersPanel
      panelId={filtersPanelId}
      flat={isMobile}
      tmdbLanguage={tmdbLanguage}
      labels={labels}
      ratingScale={ratingScale}
      selectedGenres={filters.selectedGenres}
      onToggleGenre={filters.toggleGenre}
      selectedMediaTypes={filters.selectedMediaTypes}
      onToggleMediaType={filters.toggleMediaType}
      selectedDecade={filters.selectedDecade}
      onToggleDecade={filters.toggleDecade}
      voteMin={filters.voteMin}
      onToggleVoteMin={filters.toggleVoteMin}
      runtimeRange={filters.runtimeRange}
      onChangeRuntimeRange={filters.changeRuntimeRange}
      onReset={isMobile ? undefined : filters.clearAllFilters}
    />
  );

  return (
    <FilteredCollectionLayout
      toolbar={toolbar}
      desktopFilters={desktopPanelOpen ? <div ref={panelRef}>{panel}</div> : null}
      chips={
        filters.activeFilterChips.length > 0 ? (
          <ActiveFilterChips
            chips={filters.activeFilterChips}
            groupAriaLabel={t('watchlist.filter.toggleAria')}
            removeAriaLabel={t(keys.removeFilterAria)}
          />
        ) : null
      }
      mobileSheet={
        isMobile ? (
          <FilterSheet
            open={filters.filtersOpen}
            title={t(keys.sheetTitle)}
            onClose={() => filters.setFiltersOpen(false)}
            resetLabel={t(keys.sheetReset)}
            applyLabel={pluralizeCount(filters.visibleCount, keys.applyOne, keys.apply, t)}
            onReset={filters.clearAllFilters}
          >
            {panel}
          </FilterSheet>
        ) : null
      }
      emptyFiltered={
        filters.visibleCount === 0 ? (
          <FilteredEmptyState
            title={t(keys.emptyTitle)}
            message={t(keys.emptyMessage)}
            resetLabel={t(keys.resetAll)}
            onReset={filters.resetAll}
          />
        ) : null
      }
    >
      {children}
    </FilteredCollectionLayout>
  );
}
