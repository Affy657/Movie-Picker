import CollectionToolbar from '@/features/movies/components/CollectionToolbar';
import { useTranslation } from '@/shared/i18n';
import type { MovieListSortKey, SortDirection } from '@/features/movies/hooks/useMovieListToolbar';

interface ProfileCollectionToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  filtersPanelId: string;
  activeFilterCount: number;
  sortBy: MovieListSortKey;
  sortDir: SortDirection;
  onSetSort: (key: MovieListSortKey) => void;
  isFiltered: boolean;
  visibleCount: number;
  totalCount: number;
  onClearAll: () => void;
  isMobile: boolean;
  searchLabel: string;
  sortPrimaryLabel: string;
}

export default function ProfileCollectionToolbar({
  searchLabel,
  sortPrimaryLabel,
  ...props
}: Readonly<ProfileCollectionToolbarProps>) {
  const { t } = useTranslation();
  return (
    <CollectionToolbar
      {...props}
      sortOptions={[
        { key: 'primary', label: sortPrimaryLabel },
        { key: 'title', label: t('profile.movies.toolbar.sortTitle') },
        { key: 'year', label: t('profile.movies.toolbar.sortYear') },
      ]}
      labels={{
        searchLabel,
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
