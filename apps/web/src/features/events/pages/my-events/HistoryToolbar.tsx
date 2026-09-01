import ListToolbar from '@/features/movies/components/ListToolbar';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import type { HistorySortDirection, HistorySortKey } from './useHistoryToolbar';

interface HistoryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortDir: HistorySortDirection;
  onSetSort: (key: HistorySortKey) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  filtersPanelId: string;
  activeFilterCount: number;
  isFiltered: boolean;
  visibleCount: number;
  totalCount: number;
  onClearAll: () => void;
}

export default function HistoryToolbar({
  search,
  onSearchChange,
  sortDir,
  onSetSort,
  filtersOpen,
  onToggleFilters,
  filtersPanelId,
  activeFilterCount,
  isFiltered,
  visibleCount,
  totalCount,
  onClearAll,
}: Readonly<HistoryToolbarProps>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <ListToolbar
      search={search}
      onSearchChange={onSearchChange}
      searchLabel={t('events.myEvents.searchLabel')}
      searchPlaceholder={t('events.myEvents.searchPlaceholder')}
      filtersOpen={filtersOpen}
      onToggleFilters={onToggleFilters}
      filtersPanelId={filtersPanelId}
      filtersToggleAriaLabel={t('events.myEvents.filtersToggleAria')}
      filtersLabel={t('events.myEvents.filtersLabel')}
      activeFilterCount={activeFilterCount}
      sortOptions={[{ key: 'date', label: t('events.myEvents.sortByDate') }]}
      sortBy="date"
      sortDir={sortDir}
      onSetSort={onSetSort}
      sortLabel={t('events.myEvents.sortLabel')}
      sortMenuAriaLabel={t('events.myEvents.sortMenuAria')}
      sortDirectionAscLabel={t('events.myEvents.sortDirectionAsc')}
      sortDirectionDescLabel={t('events.myEvents.sortDirectionDesc')}
      isFiltered={isFiltered}
      resultCountText={t('events.myEvents.filterResultCount', {
        count: visibleCount,
        total: totalCount,
      })}
      clearAllLabel={t('events.myEvents.clearFilters')}
      onClearAll={onClearAll}
      isMobile={isMobile}
    />
  );
}
