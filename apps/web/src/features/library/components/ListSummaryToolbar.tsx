import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { useHistoryEntryState } from '@/shared/hooks/useHistoryEntryState';
import ListToolbar from '@/features/movies/components/ListToolbar';
import {
  DEFAULT_LIST_SORT_DIRECTION,
  type ListSortDirection,
  type ListSortKey,
} from '@/features/library/utils/listSummaries';

export const SORT_LABEL_KEYS: Record<ListSortKey, TranslationKey> = {
  recent: 'lists.summary.sortRecent',
  name: 'lists.summary.sortName',
  size: 'lists.summary.sortSize',
  progress: 'lists.summary.sortProgress',
};

interface ListSummarySort {
  by: ListSortKey;
  dir: ListSortDirection;
}

const DEFAULT_SORT: ListSummarySort = { by: 'recent', dir: DEFAULT_LIST_SORT_DIRECTION.recent };

function defaultSortOf(key: ListSortKey): ListSummarySort {
  return { by: key, dir: DEFAULT_LIST_SORT_DIRECTION[key] };
}

function isListSummarySort(value: unknown): value is ListSummarySort {
  if (typeof value !== 'object' || value === null) return false;
  const { by, dir } = value as Record<string, unknown>;
  return (
    typeof by === 'string' &&
    Object.hasOwn(DEFAULT_LIST_SORT_DIRECTION, by) &&
    (dir === 'asc' || dir === 'desc')
  );
}

export function useListSummaryFilters() {
  const [search, setSearch] = useHistoryEntryState('listSummary.search', '');
  const [sort, setSort] = useHistoryEntryState('listSummary.sort', DEFAULT_SORT, isListSummarySort);

  const changeSort = (key: ListSortKey) => {
    setSort((current) =>
      current.by === key
        ? { by: key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : defaultSortOf(key)
    );
  };

  const selectSort = (key: ListSortKey) => setSort(defaultSortOf(key));

  const setSortDir = (dir: ListSortDirection) => setSort((current) => ({ ...current, dir }));

  const clearAll = () => {
    setSearch('');
    setSort(DEFAULT_SORT);
  };

  return {
    search,
    setSearch,
    sortBy: sort.by,
    sortDir: sort.dir,
    setSortDir,
    changeSort,
    selectSort,
    clearAll,
    isFiltered: search.trim().length > 0,
  };
}

export type ListSummaryFilters = ReturnType<typeof useListSummaryFilters>;

export default function ListSummaryToolbar({
  filters,
  sortKeys,
  visibleCount,
  total,
  isMobile,
}: Readonly<{
  filters: ListSummaryFilters;
  sortKeys: readonly ListSortKey[];
  visibleCount: number;
  total: number;
  isMobile: boolean;
}>) {
  const { t } = useTranslation();
  return (
    <ListToolbar
      search={filters.search}
      onSearchChange={filters.setSearch}
      searchLabel={t('lists.summary.searchLabel')}
      searchPlaceholder={t('lists.summary.searchPlaceholder')}
      sortOptions={sortKeys.map((key) => ({ key, label: t(SORT_LABEL_KEYS[key]) }))}
      sortBy={filters.sortBy}
      sortDir={filters.sortDir}
      onSetSort={filters.changeSort}
      sortLabel={t('lists.summary.sortLabel')}
      sortMenuAriaLabel={t('lists.summary.sortLabel')}
      sortDirectionAscLabel={t('watchlist.toolbar.sortDirectionAsc')}
      sortDirectionDescLabel={t('watchlist.toolbar.sortDirectionDesc')}
      isFiltered={filters.isFiltered}
      resultCountText={t('lists.summary.resultCount', { count: visibleCount, total })}
      clearAllLabel={t('lists.summary.clearAll')}
      onClearAll={filters.clearAll}
      isMobile={isMobile}
    />
  );
}
