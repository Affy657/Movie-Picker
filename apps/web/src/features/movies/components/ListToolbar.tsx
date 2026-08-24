import { ArrowDown, ArrowUp, Search, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import Menu, { MenuItem, MenuLabel, MenuSeparator } from '@/shared/components/Menu';
import styles from './ListToolbar.module.css';

export interface SortOption<TSortKey extends string> {
  key: TSortKey;
  label: string;
}

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
  const DirectionIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;
  const activeSort = sortOptions.find((opt) => opt.key === sortBy) ?? sortOptions[0];

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

        {isMobile ? (
          <span className={styles.sortMenuWrap}>
            <Menu
              triggerLabel={activeSort?.label ?? ''}
              triggerIcon={<DirectionIcon size={12} aria-hidden />}
              triggerClassName={styles.filterBtn}
              panelClassName={styles.sortMenuPanel}
              panelLabel={sortMenuAriaLabel}
            >
              {(close) => (
                <>
                  <MenuLabel>{sortLabel}</MenuLabel>
                  {sortOptions.map((opt) => (
                    <MenuItem
                      key={opt.key}
                      selected={sortBy === opt.key}
                      onClick={() => {
                        onSetSort(opt.key);
                        close();
                      }}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                  <MenuSeparator />
                  <MenuItem
                    icon={<DirectionIcon size={13} aria-hidden />}
                    onClick={() => {
                      onSetSort(sortBy);
                      close();
                    }}
                  >
                    {sortDir === 'asc' ? sortDirectionAscLabel : sortDirectionDescLabel}
                  </MenuItem>
                </>
              )}
            </Menu>
          </span>
        ) : (
          <span className={styles.sortPillsRow} role="toolbar" aria-label={sortLabel}>
            <span className={styles.sortLabel}>{sortLabel}</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={clsx(styles.pill, sortBy === opt.key && styles.pillActive)}
                aria-pressed={sortBy === opt.key}
                onClick={() => onSetSort(opt.key)}
              >
                <span className={styles.pillLabel}>{opt.label}</span>
                {sortBy === opt.key ? <DirectionIcon size={12} aria-hidden /> : null}
              </button>
            ))}
          </span>
        )}

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
