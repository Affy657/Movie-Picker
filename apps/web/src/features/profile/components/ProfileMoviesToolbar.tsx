import ListToolbar from '@/features/movies/components/ListToolbar';
import { useTranslation } from '@/shared/i18n';
import type {
  ProfileMoviesSortKey,
  SortDirection,
} from '@/features/profile/hooks/useProfileMoviesToolbar';

interface ProfileMoviesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  filtersPanelId: string;
  activeFilterCount: number;
  sortBy: ProfileMoviesSortKey;
  sortDir: SortDirection;
  onSetSort: (key: ProfileMoviesSortKey) => void;
  isFiltered: boolean;
  visibleCount: number;
  totalCount: number;
  onClearAll: () => void;
  isMobile: boolean;
}

export default function ProfileMoviesToolbar(props: Readonly<ProfileMoviesToolbarProps>) {
  const { t } = useTranslation();

  return (
    <ListToolbar
      search={props.search}
      onSearchChange={props.onSearchChange}
      searchLabel={t('profile.movies.toolbar.searchLabel')}
      searchPlaceholder={t('profile.movies.toolbar.searchPlaceholder')}
      filtersOpen={props.filtersOpen}
      onToggleFilters={props.onToggleFilters}
      filtersPanelId={props.filtersPanelId}
      filtersToggleAriaLabel={t('profile.movies.toolbar.filtersToggleAria')}
      filtersLabel={t('profile.movies.toolbar.filtersLabel')}
      activeFilterCount={props.activeFilterCount}
      sortOptions={[
        { key: 'watchedAt', label: t('profile.movies.toolbar.sortWatchedAt') },
        { key: 'title', label: t('profile.movies.toolbar.sortTitle') },
        { key: 'year', label: t('profile.movies.toolbar.sortYear') },
      ]}
      sortBy={props.sortBy}
      sortDir={props.sortDir}
      onSetSort={props.onSetSort}
      sortLabel={t('profile.movies.toolbar.sortLabel')}
      sortMenuAriaLabel={t('profile.movies.toolbar.sortMenuAria')}
      sortDirectionAscLabel={t('profile.movies.toolbar.sortDirectionAsc')}
      sortDirectionDescLabel={t('profile.movies.toolbar.sortDirectionDesc')}
      isFiltered={props.isFiltered}
      resultCountText={t('profile.movies.toolbar.resultCount', {
        count: props.visibleCount,
        total: props.totalCount,
      })}
      clearAllLabel={t('profile.movies.toolbar.clearAll')}
      onClearAll={props.onClearAll}
      isMobile={props.isMobile}
    />
  );
}
