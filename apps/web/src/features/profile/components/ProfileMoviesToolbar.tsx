import { ArrowDown, ArrowUp, Search, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import Menu, { MenuItem, MenuLabel, MenuSeparator } from '@/shared/components/Menu';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import type {
  ProfileMoviesSortKey,
  SortDirection,
} from '@/features/profile/hooks/useProfileMoviesToolbar';
import styles from '@/features/watchlist/components/WatchlistToolbar.module.css';

const SORT_KEYS: ProfileMoviesSortKey[] = ['proposedAt', 'title', 'year'];

const SORT_LABEL_KEYS: Record<ProfileMoviesSortKey, TranslationKey> = {
  proposedAt: 'profile.movies.toolbar.sortProposedAt',
  title: 'profile.movies.toolbar.sortTitle',
  year: 'profile.movies.toolbar.sortYear',
};

interface ProfileMoviesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  filtersPanelId: string;
  activeFilterCount: number;
  sortBy: ProfileMoviesSortKey;
  sortDir: SortDirection;
  onSetSort: (key: ProfileMoviesSortKey) => void;
  isFiltered: boolean;
  visibleCount: number;
  totalCount: number;
  onClearAll: () => void;
  isMobile: boolean;
}

export default function ProfileMoviesToolbar({
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
}: Readonly<ProfileMoviesToolbarProps>) {
  const { t } = useTranslation();
  const DirectionIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div className={styles.toolbar}>
      <span className={styles.searchWrap}>
        <Search size={15} aria-hidden className={styles.searchIcon} />
        <input
          type="search"
          className={styles.input}
          placeholder={t('profile.movies.toolbar.searchPlaceholder')}
          aria-label={t('profile.movies.toolbar.searchLabel')}
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
          aria-label={t('profile.movies.toolbar.filtersToggleAria')}
        >
          <SlidersHorizontal size={15} aria-hidden />
          <span className={styles.filterBtnLabel}>{t('profile.movies.toolbar.filtersLabel')}</span>
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
              panelLabel={t('profile.movies.toolbar.sortMenuAria')}
            >
              {(close) => (
                <>
                  <MenuLabel>{t('profile.movies.toolbar.sortLabel')}</MenuLabel>
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
                        ? 'profile.movies.toolbar.sortDirectionAsc'
                        : 'profile.movies.toolbar.sortDirectionDesc'
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
            aria-label={t('profile.movies.toolbar.sortLabel')}
          >
            <span className={styles.sortLabel}>{t('profile.movies.toolbar.sortLabel')}</span>
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
            {t('profile.movies.toolbar.resultCount', { count: visibleCount, total: totalCount })}
            <button type="button" className={styles.linkReset} onClick={onClearAll}>
              {t('profile.movies.toolbar.clearAll')}
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}
