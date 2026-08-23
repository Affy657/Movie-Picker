import ListToolbar from '@/features/movies/components/ListToolbar';
import { useTranslation } from '@/shared/i18n';
import type {
  WatchlistSortKey,
  SortDirection,
} from '@/features/watchlist/hooks/useWatchlistToolbar';

interface WatchlistToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  filtersPanelId: string;
  activeFilterCount: number;
  sortBy: WatchlistSortKey;
  sortDir: SortDirection;
  onSetSort: (key: WatchlistSortKey) => void;
  isFiltered: boolean;
  visibleCount: number;
  totalCount: number;
  onClearAll: () => void;
  isMobile: boolean;
}

export default function WatchlistToolbar(props: Readonly<WatchlistToolbarProps>) {
  const { t } = useTranslation();

  return (
    <ListToolbar
      search={props.search}
      onSearchChange={props.onSearchChange}
      searchLabel={t('watchlist.toolbar.searchLabel')}
      searchPlaceholder={t('watchlist.toolbar.searchPlaceholder')}
      filtersOpen={props.filtersOpen}
      onToggleFilters={props.onToggleFilters}
      filtersPanelId={props.filtersPanelId}
      filtersToggleAriaLabel={t('watchlist.toolbar.filtersToggleAria')}
      filtersLabel={t('watchlist.toolbar.filtersLabel')}
      activeFilterCount={props.activeFilterCount}
      sortOptions={[
        { key: 'createdAt', label: t('watchlist.toolbar.sortAddedAt') },
        { key: 'title', label: t('watchlist.toolbar.sortTitle') },
        { key: 'voteAverage', label: t('watchlist.toolbar.sortVoteAverage') },
        { key: 'duration', label: t('watchlist.toolbar.sortDuration') },
      ]}
      sortBy={props.sortBy}
      sortDir={props.sortDir}
      onSetSort={props.onSetSort}
      sortLabel={t('watchlist.toolbar.sortLabel')}
      sortMenuAriaLabel={t('watchlist.toolbar.sortMenuAria')}
      sortDirectionAscLabel={t('watchlist.toolbar.sortDirectionAsc')}
      sortDirectionDescLabel={t('watchlist.toolbar.sortDirectionDesc')}
      isFiltered={props.isFiltered}
      resultCountText={t('watchlist.toolbar.resultCount', {
        count: props.visibleCount,
        total: props.totalCount,
      })}
      clearAllLabel={t('watchlist.toolbar.clearAll')}
      onClearAll={props.onClearAll}
      isMobile={props.isMobile}
    />
  );
}
