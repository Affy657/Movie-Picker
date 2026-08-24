import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import EmptyState from '@/shared/components/EmptyState';
import Sheet from '@/shared/components/Sheet';
import styles from './FilteredCollectionLayout.module.css';

type CollectionToolbarSource<TSort extends string> = {
  search: string;
  setSearch: (value: string) => void;
  filtersOpen: boolean;
  setFiltersOpen: (value: boolean | ((open: boolean) => boolean)) => void;
  sortBy: TSort;
  sortDir: 'asc' | 'desc';
  setSortBy: (key: TSort) => void;
  isFiltered: boolean;
  visibleCount: number;
  totalCount: number;
  resetAll: () => void;
};

export function toCollectionToolbarProps<TSort extends string>(
  toolbar: CollectionToolbarSource<TSort>,
  extras: { filtersPanelId: string; activeFilterCount: number; isMobile: boolean }
) {
  return {
    search: toolbar.search,
    onSearchChange: toolbar.setSearch,
    filtersOpen: toolbar.filtersOpen,
    onToggleFilters: () => toolbar.setFiltersOpen((open) => !open),
    filtersPanelId: extras.filtersPanelId,
    activeFilterCount: extras.activeFilterCount,
    sortBy: toolbar.sortBy,
    sortDir: toolbar.sortDir,
    onSetSort: toolbar.setSortBy,
    isFiltered: toolbar.isFiltered,
    visibleCount: toolbar.visibleCount,
    totalCount: toolbar.totalCount,
    onClearAll: toolbar.resetAll,
    isMobile: extras.isMobile,
  };
}

export function FilterSheet({
  open,
  title,
  onClose,
  resetLabel,
  applyLabel,
  onReset,
  children,
}: Readonly<{
  open: boolean;
  title: string;
  onClose: () => void;
  resetLabel: string;
  applyLabel: string;
  onReset: () => void;
  children: ReactNode;
}>) {
  return (
    <Sheet
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.sheetReset} onClick={onReset}>
            {resetLabel}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            {applyLabel}
          </button>
        </>
      }
    >
      {children}
    </Sheet>
  );
}

export function FilteredEmptyState({
  title,
  message,
  resetLabel,
  onReset,
}: Readonly<{
  title: string;
  message: string;
  resetLabel: string;
  onReset: () => void;
}>) {
  return (
    <EmptyState
      compact
      icon={<Search aria-hidden size={22} />}
      title={title}
      message={message}
      actions={
        <button type="button" className="btn btn-sm" onClick={onReset}>
          {resetLabel}
        </button>
      }
    />
  );
}

export default function FilteredCollectionLayout({
  toolbar,
  desktopFilters,
  chips,
  mobileSheet,
  emptyFiltered,
  children,
}: Readonly<{
  toolbar: ReactNode;
  desktopFilters: ReactNode;
  chips: ReactNode;
  mobileSheet: ReactNode;
  emptyFiltered: ReactNode | null;
  children: ReactNode;
}>) {
  return (
    <>
      <div className={styles.toolbarBlock}>
        {toolbar}
        {desktopFilters}
        {chips}
      </div>
      {mobileSheet}
      {emptyFiltered ?? children}
    </>
  );
}
