import type { ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import SearchField from '@/shared/components/SearchField';
import SortControl, { type SortOption } from '@/features/movies/components/SortControl';
import styles from './ListToolbar.module.css';
import Button from '@/shared/components/Button';
import LinkButton from '@/shared/components/LinkButton';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';
import CountBadge from '@/shared/components/CountBadge';

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
  hideSort?: boolean;
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
  hideSort = false,
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
            <Button
              variant={activeFilterCount > 0 || filtersOpen ? 'soft' : 'secondary'}
              className={styles.filterBtn}
              onClick={onToggleFilters}
              aria-expanded={filtersOpen}
              aria-controls={filtersPanelId}
              aria-label={filtersToggleAriaLabel}
              data-filters-toggle
            >
              <SlidersHorizontal size={ICON_SIZE.md} aria-hidden />
              {filtersLabel}
              {activeFilterCount > 0 && <CountBadge value={activeFilterCount} aria-hidden="true" />}
            </Button>

            {hideSort ? null : <span className={styles.divider} aria-hidden="true" />}
          </>
        ) : null}

        {hideSort ? null : (
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
        )}

        {isFiltered ? (
          <span className={styles.resultCount}>
            {resultCountText}
            <LinkButton size="sm" onClick={onClearAll}>
              {clearAllLabel}
            </LinkButton>
          </span>
        ) : null}

        {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
      </div>
    </Card>
  );
}
