import CollectionToolbar from '@/features/movies/components/CollectionToolbar';
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
    <CollectionToolbar
      {...props}
      sortOptions={[
        { key: 'watchedAt', label: t('profile.movies.toolbar.sortWatchedAt') },
        { key: 'title', label: t('profile.movies.toolbar.sortTitle') },
        { key: 'year', label: t('profile.movies.toolbar.sortYear') },
      ]}
      labels={{
        searchLabel: t('profile.movies.toolbar.searchLabel'),
        searchPlaceholder: t('profile.movies.toolbar.searchPlaceholder'),
        filtersToggleAriaLabel: t('profile.movies.toolbar.filtersToggleAria'),
        filtersLabel: t('profile.movies.toolbar.filtersLabel'),
        sortLabel: t('profile.movies.toolbar.sortLabel'),
        sortMenuAriaLabel: t('profile.movies.toolbar.sortMenuAria'),
        sortDirectionAscLabel: t('profile.movies.toolbar.sortDirectionAsc'),
        sortDirectionDescLabel: t('profile.movies.toolbar.sortDirectionDesc'),
        resultCountText: t('profile.movies.toolbar.resultCount', {
          count: props.visibleCount,
          total: props.totalCount,
        }),
        clearAllLabel: t('profile.movies.toolbar.clearAll'),
      }}
    />
  );
}
