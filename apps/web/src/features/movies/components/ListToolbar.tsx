import type { ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import SearchField from '@/shared/components/SearchField';
import SortControl, { type SortOption } from '@/features/movies/components/SortControl';
import styles from './ListToolbar.module.css';
import LinkButton from '@/shared/components/LinkButton';
import Card from '@/shared/components/Card';

export type { SortOption };

export interface ListToolbarProps<TSortKey extends string> {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  filtersOpen?: boolean;
  onToggleFilters?: () => void;
  filtersPanelId?: string;
  filtersToggleAriaLabel?: string;
  filtersLabel?: string;
  activeFilterCount?: number;
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
  trailing?: ReactNode;
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
  activeFilterCount = 0,
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
  trailing,
}: Readonly<ListToolbarProps<TSortKey>>) {
  return (
    <Card padding="none" elevation="sm" className={styles.toolbar}>
      <SearchField
        className={styles.searchWrap}
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        ariaLabel={searchLabel}
      />

      <div className={styles.bottomRow}>
        {onToggleFilters ? (
          <>
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
          </>
        ) : null}

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
            <LinkButton onClick={onClearAll}>{clearAllLabel}</LinkButton>
          </span>
        ) : null}

        {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
      </div>
    </Card>
  );
}
