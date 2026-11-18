import type { ReactNode } from 'react';
import CollectionToolbar from '@/features/movies/components/CollectionToolbar';
import type { SortOption } from '@/features/movies/components/ListToolbar';
import type { LibraryMovieRowSorts } from '@/features/movies/components/LibraryMovieRow';
import { useTranslation, type TranslationKey, type Translate } from '@/shared/i18n';
import type { WatchlistSortKey, SortDirection } from '@/features/library/hooks/useWatchlistToolbar';

const SORT_LABEL_KEYS: Record<WatchlistSortKey, TranslationKey> = {
  relevance: 'showcase.toolbar.sortRelevance',
  createdAt: 'watchlist.toolbar.sortAddedAt',
  title: 'watchlist.toolbar.sortTitle',
  voteAverage: 'watchlist.toolbar.sortVoteAverage',
  duration: 'watchlist.toolbar.sortDuration',
  year: 'watchlist.toolbar.sortYear',
  availability: 'movies.watchProviders.columnLabel',
};

export interface WatchlistSortConfig {
  keys: readonly WatchlistSortKey[];
  labels?: Partial<Record<WatchlistSortKey, string>>;
  defaultKey?: WatchlistSortKey;
}

const OPT_IN_SORTS: ReadonlySet<WatchlistSortKey> = new Set(['relevance']);

function allows(key: WatchlistSortKey, withAvailability: boolean, config?: WatchlistSortConfig) {
  if (key === 'availability' && !withAvailability) return false;
  if (!config) return !OPT_IN_SORTS.has(key);
  return config.keys.includes(key);
}

function sortOption(
  key: WatchlistSortKey,
  t: Translate,
  config?: WatchlistSortConfig
): SortOption<WatchlistSortKey> {
  return { key, label: config?.labels?.[key] ?? t(SORT_LABEL_KEYS[key]) };
}

export function watchlistSortOptions(
  t: Translate,
  withAvailability = true,
  config?: WatchlistSortConfig
): SortOption<WatchlistSortKey>[] {
  return (Object.keys(SORT_LABEL_KEYS) as WatchlistSortKey[])
    .filter((key) => allows(key, withAvailability, config))
    .map((key) => sortOption(key, t, config));
}

export function watchlistRowSorts(
  t: Translate,
  withAvailability = true,
  config?: WatchlistSortConfig
): LibraryMovieRowSorts<WatchlistSortKey> {
  const sortFor = (key: WatchlistSortKey) =>
    allows(key, withAvailability, config) ? sortOption(key, t, config) : undefined;
  return {
    title: (['relevance', 'createdAt', 'title'] as const).flatMap((key) => sortFor(key) ?? []),
    vote: sortFor('voteAverage'),
    runtime: sortFor('duration'),
    year: sortFor('year'),
    availability: sortFor('availability'),
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
  beforeSort?: ReactNode;
  trailing?: ReactNode;
  withAvailability?: boolean;
  sorts?: WatchlistSortConfig;
  searchLabel?: string;
  searchPlaceholder?: string;
}

export default function WatchlistToolbar({
  withAvailability = true,
  sorts,
  searchLabel,
  searchPlaceholder,
  ...props
}: Readonly<WatchlistToolbarProps>) {
  const { t } = useTranslation();
  return (
    <CollectionToolbar
      {...props}
      sortOptions={watchlistSortOptions(t, withAvailability, sorts)}
      labels={{
        searchLabel: searchLabel ?? t('watchlist.toolbar.searchLabel'),
        searchPlaceholder: searchPlaceholder ?? t('watchlist.toolbar.searchPlaceholder'),
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
