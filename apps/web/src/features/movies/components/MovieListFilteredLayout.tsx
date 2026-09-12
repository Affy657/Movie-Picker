import { useMemo, useRef, type ReactNode } from 'react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { MovieMediaType } from '@/shared/types/movie';
import type { ActiveToolbarChip } from '@/features/movies/hooks/useMovieListToolbar';
import ActiveFilterChips from './ActiveFilterChips';
import FilteredCollectionLayout, {
  FilterSheet,
  FilteredEmptyState,
} from './FilteredCollectionLayout';
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
  clearAllFilters: () => void;
  resetAll: () => void;
  activeFilterChips: ActiveToolbarChip[];
  visibleCount: number;
}

interface MovieListFilteredLayoutProps {
  toolbar: ReactNode;
  filters: MovieListFilters;
  filtersPanelId: string;
  tmdbLanguage: string;
  isMobile: boolean;
  children: ReactNode;
}

export default function MovieListFilteredLayout({
  toolbar,
  filters,
  filtersPanelId,
  tmdbLanguage,
  isMobile,
  children,
}: Readonly<MovieListFilteredLayoutProps>) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const desktopPanelOpen = filters.filtersOpen && !isMobile;
  useClickOutside(
    panelRef,
    () => filters.setFiltersOpen(false),
    desktopPanelOpen,
    '[data-filters-toggle]'
  );

  const labels = useMemo(
    () => ({
      genre: t('watchlist.toolbar.filterGenre'),
      type: t('watchlist.toolbar.filterType'),
      typeMovie: t('watchlist.toolbar.filterTypeMovie'),
      typeTv: t('watchlist.toolbar.filterTypeTv'),
      decade: t('watchlist.toolbar.filterDecade'),
      resetAll: t('profile.movies.toolbar.filtersResetAll'),
    }),
    [t]
  );

  const panel = (
    <MovieListFiltersPanel
      panelId={filtersPanelId}
      tmdbLanguage={tmdbLanguage}
      labels={labels}
      selectedGenres={filters.selectedGenres}
      onToggleGenre={filters.toggleGenre}
      selectedMediaTypes={filters.selectedMediaTypes}
      onToggleMediaType={filters.toggleMediaType}
      selectedDecade={filters.selectedDecade}
      onToggleDecade={filters.toggleDecade}
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
            removeAriaLabel={t('profile.movies.toolbar.removeFilterAria')}
          />
        ) : null
      }
      mobileSheet={
        isMobile ? (
          <FilterSheet
            open={filters.filtersOpen}
            title={t('profile.movies.toolbar.filtersSheetTitle')}
            onClose={() => filters.setFiltersOpen(false)}
            resetLabel={t('profile.movies.toolbar.filtersReset')}
            applyLabel={pluralizeCount(
              filters.visibleCount,
              'profile.movies.toolbar.filtersApplyOne',
              'profile.movies.toolbar.filtersApply',
              t
            )}
            onReset={filters.clearAllFilters}
          >
            {panel}
          </FilterSheet>
        ) : null
      }
      emptyFiltered={
        filters.visibleCount === 0 ? (
          <FilteredEmptyState
            title={t('profile.movies.toolbar.emptyTitle')}
            message={t('profile.movies.toolbar.emptyMessage')}
            resetLabel={t('profile.movies.toolbar.filtersResetAll')}
            onReset={filters.resetAll}
          />
        ) : null
      }
    >
      {children}
    </FilteredCollectionLayout>
  );
}
