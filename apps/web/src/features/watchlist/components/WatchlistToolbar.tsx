import type { ReactNode } from 'react';
import CollectionToolbar from '@/features/movies/components/CollectionToolbar';
import type { SortOption } from '@/features/movies/components/ListToolbar';
import type { MovieListRowSorts } from '@/features/movies/components/MovieListRow';
import type { Translate } from '@/features/movies/types';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import type {
  WatchlistSortKey,
  SortDirection,
} from '@/features/watchlist/hooks/useWatchlistToolbar';

const SORT_LABEL_KEYS: Record<WatchlistSortKey, TranslationKey> = {
  createdAt: 'watchlist.toolbar.sortAddedAt',
  title: 'watchlist.toolbar.sortTitle',
  voteAverage: 'watchlist.toolbar.sortVoteAverage',
  duration: 'watchlist.toolbar.sortDuration',
  year: 'watchlist.toolbar.sortYear',
  availability: 'movies.watchProviders.columnLabel',
};

function sortOption(key: WatchlistSortKey, t: Translate): SortOption<WatchlistSortKey> {
  return { key, label: t(SORT_LABEL_KEYS[key]) };
}

export function watchlistSortOptions(t: Translate): SortOption<WatchlistSortKey>[] {
  return (Object.keys(SORT_LABEL_KEYS) as WatchlistSortKey[]).map((key) => sortOption(key, t));
}

export function watchlistRowSorts(t: Translate): MovieListRowSorts<WatchlistSortKey> {
  return {
    title: [sortOption('createdAt', t), sortOption('title', t)],
    vote: sortOption('voteAverage', t),
    runtime: sortOption('duration', t),
    year: sortOption('year', t),
    availability: sortOption('availability', t),
  };
}

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
  hideSort?: boolean;
  trailing?: ReactNode;
}

export default function WatchlistToolbar(props: Readonly<WatchlistToolbarProps>) {
  const { t } = useTranslation();
  return (
    <CollectionToolbar
      {...props}
      sortOptions={watchlistSortOptions(t)}
      labels={{
        searchLabel: t('watchlist.toolbar.searchLabel'),
        searchPlaceholder: t('watchlist.toolbar.searchPlaceholder'),
        filtersToggleAriaLabel: t('watchlist.toolbar.filtersToggleAria'),
        filtersLabel: t('watchlist.toolbar.filtersLabel'),
        sortLabel: t('watchlist.toolbar.sortLabel'),
        sortMenuAriaLabel: t('watchlist.toolbar.sortMenuAria'),
        sortDirectionAscLabel: t('watchlist.toolbar.sortDirectionAsc'),
        sortDirectionDescLabel: t('watchlist.toolbar.sortDirectionDesc'),
        resultCountText: t('watchlist.toolbar.resultCount', {
          count: props.visibleCount,
          total: props.totalCount,
        }),
        clearAllLabel: t('watchlist.toolbar.clearAll'),
      }}
    />
  );
}
