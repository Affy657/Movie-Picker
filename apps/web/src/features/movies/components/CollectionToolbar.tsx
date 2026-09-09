import type { ReactNode } from 'react';
import ListToolbar, { type SortOption } from '@/features/movies/components/ListToolbar';

export type CollectionToolbarLabels = {
  searchLabel: string;
  searchPlaceholder: string;
  filtersToggleAriaLabel: string;
  filtersLabel: string;
  sortLabel: string;
  sortMenuAriaLabel: string;
  sortDirectionAscLabel: string;
  sortDirectionDescLabel: string;
  resultCountText: string;
  clearAllLabel: string;
};

type CollectionToolbarProps<TSortKey extends string> = {
  search: string;
  onSearchChange: (value: string) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  filtersPanelId: string;
  activeFilterCount: number;
  sortOptions: SortOption<TSortKey>[];
  sortBy: TSortKey;
  sortDir: 'asc' | 'desc';
  onSetSort: (key: TSortKey) => void;
  isFiltered: boolean;
  visibleCount: number;
  totalCount: number;
  onClearAll: () => void;
  isMobile: boolean;
  trailing?: ReactNode;
  labels: CollectionToolbarLabels;
};

export default function CollectionToolbar<TSortKey extends string>({
  labels,
  ...rest
}: Readonly<CollectionToolbarProps<TSortKey>>) {
  return (
    <ListToolbar
      search={rest.search}
      onSearchChange={rest.onSearchChange}
      searchLabel={labels.searchLabel}
      searchPlaceholder={labels.searchPlaceholder}
      filtersOpen={rest.filtersOpen}
      onToggleFilters={rest.onToggleFilters}
      filtersPanelId={rest.filtersPanelId}
      filtersToggleAriaLabel={labels.filtersToggleAriaLabel}
      filtersLabel={labels.filtersLabel}
      activeFilterCount={rest.activeFilterCount}
      sortOptions={rest.sortOptions}
      sortBy={rest.sortBy}
      sortDir={rest.sortDir}
      onSetSort={rest.onSetSort}
      sortLabel={labels.sortLabel}
      sortMenuAriaLabel={labels.sortMenuAriaLabel}
      sortDirectionAscLabel={labels.sortDirectionAscLabel}
      sortDirectionDescLabel={labels.sortDirectionDescLabel}
      isFiltered={rest.isFiltered}
      resultCountText={labels.resultCountText}
      clearAllLabel={labels.clearAllLabel}
      onClearAll={rest.onClearAll}
      isMobile={rest.isMobile}
      trailing={rest.trailing}
    />
  );
}
