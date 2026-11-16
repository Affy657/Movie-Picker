import { useState } from 'react';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import ListToolbar from '@/features/movies/components/ListToolbar';
import {
  DEFAULT_LIST_SORT_DIRECTION,
  type ListSortDirection,
  type ListSortKey,
} from '@/features/lists/utils/listSummaries';

const SORT_LABEL_KEYS: Record<ListSortKey, TranslationKey> = {
  recent: 'lists.summary.sortRecent',
  name: 'lists.summary.sortName',
  size: 'lists.summary.sortSize',
  progress: 'lists.summary.sortProgress',
};

export function useListSummaryFilters() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<ListSortKey>('recent');
  const [sortDir, setSortDir] = useState<ListSortDirection>(DEFAULT_LIST_SORT_DIRECTION.recent);

  const changeSort = (key: ListSortKey) => {
    if (key === sortBy) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setSortDir(DEFAULT_LIST_SORT_DIRECTION[key]);
  };

  const clearAll = () => {
    setSearch('');
    setSortBy('recent');
    setSortDir(DEFAULT_LIST_SORT_DIRECTION.recent);
  };

  return {
    search,
    setSearch,
    sortBy,
    sortDir,
    changeSort,
    clearAll,
    isFiltered: search.trim().length > 0,
  };
}

type ListSummaryFilters = ReturnType<typeof useListSummaryFilters>;

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
