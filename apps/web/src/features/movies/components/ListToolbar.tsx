import { Search, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import SortControl, { type SortOption } from '@/features/movies/components/SortControl';
import styles from './ListToolbar.module.css';

export type { SortOption };

export interface ListToolbarProps<TSortKey extends string> {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  filtersPanelId: string;
  filtersToggleAriaLabel: string;
  filtersLabel: string;
  activeFilterCount: number;
  sortOptions: SortOption<TSortKey>[];
  sortBy: TSortKey;
  sortDir: 'asc' | 'desc';
  onSetSort: (key: TSortKey) => void;
  sortLabel: string;
  sortMenuAriaLabel: string;
  sortDirectionAscLabel: string;
  sortDirectionDescLabel: string;
  isFiltered: boolean;
  resultCountText: string;
  clearAllLabel: string;
  onClearAll: () => void;
  isMobile: boolean;
}

export default function ListToolbar<TSortKey extends string>({
  search,
  onSearchChange,
  searchLabel,
  searchPlaceholder,
  filtersOpen,
  onToggleFilters,
  filtersPanelId,
  filtersToggleAriaLabel,
  filtersLabel,
  activeFilterCount,
  sortOptions,
  sortBy,
  sortDir,
  onSetSort,
  sortLabel,
  sortMenuAriaLabel,
  sortDirectionAscLabel,
  sortDirectionDescLabel,
  isFiltered,
  resultCountText,
  clearAllLabel,
  onClearAll,
  isMobile,
}: Readonly<ListToolbarProps<TSortKey>>) {
  return (
    <div className={styles.toolbar}>
      <span className={styles.searchWrap}>
        <Search size={15} aria-hidden className={styles.searchIcon} />
        <input
          type="search"
          className={styles.input}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </span>

      <div className={styles.bottomRow}>
        <button
          type="button"
          className={clsx(styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive)}
          onClick={onToggleFilters}
          aria-expanded={filtersOpen}
          aria-controls={filtersPanelId}
          aria-label={filtersToggleAriaLabel}
          data-filters-toggle
        >
          <SlidersHorizontal size={15} aria-hidden />
          <span className={styles.filterBtnLabel}>{filtersLabel}</span>
          {activeFilterCount > 0 && (
            <span className={styles.badgeCount} aria-hidden="true">
              <span className={styles.badgeCountText}>{activeFilterCount}</span>
            </span>
          )}
        </button>

        <span className={styles.divider} aria-hidden="true" />

        <SortControl
          sortOptions={sortOptions}
          sortBy={sortBy}
          sortDir={sortDir}
          onSetSort={onSetSort}
          sortLabel={sortLabel}
          sortMenuAriaLabel={sortMenuAriaLabel}
          sortDirectionAscLabel={sortDirectionAscLabel}
          sortDirectionDescLabel={sortDirectionDescLabel}
          isMobile={isMobile}
        />

        {isFiltered ? (
          <span className={styles.resultCount}>
            {resultCountText}
            <button type="button" className={styles.linkReset} onClick={onClearAll}>
              {clearAllLabel}
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}
