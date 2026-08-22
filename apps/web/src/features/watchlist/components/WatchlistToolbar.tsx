import { ArrowDown, ArrowUp, Search, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import Menu, { MenuItem, MenuLabel, MenuSeparator } from '@/shared/components/Menu';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import type {
  WatchlistSortKey,
  SortDirection,
} from '@/features/watchlist/hooks/useWatchlistToolbar';
import styles from './WatchlistToolbar.module.css';

const SORT_KEYS: WatchlistSortKey[] = ['createdAt', 'title', 'voteAverage', 'duration'];

const SORT_LABEL_KEYS: Record<WatchlistSortKey, TranslationKey> = {
  createdAt: 'watchlist.toolbar.sortAddedAt',
  title: 'watchlist.toolbar.sortTitle',
  voteAverage: 'watchlist.toolbar.sortVoteAverage',
  duration: 'watchlist.toolbar.sortDuration',
};

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
}

export default function WatchlistToolbar({
  search,
  onSearchChange,
  filtersOpen,
  onToggleFilters,
  filtersPanelId,
  activeFilterCount,
  sortBy,
  sortDir,
  onSetSort,
  isFiltered,
  visibleCount,
  totalCount,
  onClearAll,
  isMobile,
}: Readonly<WatchlistToolbarProps>) {
  const { t } = useTranslation();
  const DirectionIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div className={styles.toolbar}>
      <span className={styles.searchWrap}>
        <Search size={15} aria-hidden className={styles.searchIcon} />
        <input
          type="search"
          className={styles.input}
          placeholder={t('watchlist.toolbar.searchPlaceholder')}
          aria-label={t('watchlist.toolbar.searchLabel')}
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
          aria-label={t('watchlist.toolbar.filtersToggleAria')}
        >
          <SlidersHorizontal size={15} aria-hidden />
          <span className={styles.filterBtnLabel}>{t('watchlist.toolbar.filtersLabel')}</span>
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
              triggerLabel={t(SORT_LABEL_KEYS[sortBy])}
              triggerIcon={<DirectionIcon size={12} aria-hidden />}
              triggerClassName={styles.filterBtn}
              panelClassName={styles.sortMenuPanel}
              panelLabel={t('watchlist.toolbar.sortMenuAria')}
            >
              {(close) => (
                <>
                  <MenuLabel>{t('watchlist.toolbar.sortLabel')}</MenuLabel>
                  {SORT_KEYS.map((key) => (
                    <MenuItem
                      key={key}
                      selected={sortBy === key}
                      onClick={() => {
                        onSetSort(key);
                        close();
                      }}
                    >
                      {t(SORT_LABEL_KEYS[key])}
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
                    {t(
                      sortDir === 'asc'
                        ? 'watchlist.toolbar.sortDirectionAsc'
                        : 'watchlist.toolbar.sortDirectionDesc'
                    )}
                  </MenuItem>
                </>
              )}
            </Menu>
          </span>
        ) : (
          <span
            className={styles.sortPillsRow}
            role="toolbar"
            aria-label={t('watchlist.toolbar.sortLabel')}
          >
            <span className={styles.sortLabel}>{t('watchlist.toolbar.sortLabel')}</span>
            {SORT_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={clsx(styles.pill, sortBy === key && styles.pillActive)}
                aria-pressed={sortBy === key}
                onClick={() => onSetSort(key)}
              >
                <span className={styles.pillLabel}>{t(SORT_LABEL_KEYS[key])}</span>
                {sortBy === key ? <DirectionIcon size={12} aria-hidden /> : null}
              </button>
            ))}
          </span>
        )}

        {isFiltered ? (
          <span className={styles.resultCount}>
            {t('watchlist.toolbar.resultCount', { count: visibleCount, total: totalCount })}
            <button type="button" className={styles.linkReset} onClick={onClearAll}>
              {t('watchlist.toolbar.clearAll')}
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}
