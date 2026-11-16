import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { buttonClass, buttonLabelClass } from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import { MenuItem, MenuLabel, MenuPanel, MenuSeparator } from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useMenuState } from '@/shared/hooks/useMenuState';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import {
  SORT_LABEL_KEYS,
  type ListSummaryFilters,
} from '@/features/lists/components/ListSummaryToolbar';
import {
  DEFAULT_LIST_SORT_DIRECTION,
  type ListSortDirection,
  type ListSortKey,
} from '@/features/lists/utils/listSummaries';
import styles from './ListSortMenu.module.css';

const DIRECTION_LABEL_KEYS: Record<ListSortKey, Record<ListSortDirection, TranslationKey>> = {
  recent: { desc: 'lists.summary.sortRecentDesc', asc: 'lists.summary.sortRecentAsc' },
  name: { asc: 'lists.summary.sortNameAsc', desc: 'lists.summary.sortNameDesc' },
  size: { desc: 'lists.summary.sortSizeDesc', asc: 'lists.summary.sortSizeAsc' },
  progress: { desc: 'lists.summary.sortProgressDesc', asc: 'lists.summary.sortProgressAsc' },
};

function directionsOf(key: ListSortKey): ListSortDirection[] {
  const first = DEFAULT_LIST_SORT_DIRECTION[key];
  return [first, first === 'asc' ? 'desc' : 'asc'];
}

export default function ListSortMenu({
  filters,
  sortKeys,
  isMobile,
}: Readonly<{
  filters: ListSummaryFilters;
  sortKeys: readonly ListSortKey[];
  isMobile: boolean;
}>) {
  const { t } = useTranslation();
  const menu = useMenuState({ align: 'right' });
  const label = t('lists.summary.sortTrigger', { sort: t(SORT_LABEL_KEYS[filters.sortBy]) });

  return (
    <div ref={menu.containerRef} className={styles.container}>
      {isMobile ? (
        <IconButton {...menu.triggerProps} ariaLabel={label}>
          <ArrowUpDown size={ICON_SIZE.lg} aria-hidden />
        </IconButton>
      ) : (
        <button
          {...menu.triggerProps}
          type="button"
          className={buttonClass({ variant: menu.open ? 'soft' : 'secondary', size: 'md' })}
        >
          <ArrowUpDown size={ICON_SIZE.md} aria-hidden />
          <span className={buttonLabelClass(label)}>{label}</span>
          <ChevronDown size={ICON_SIZE.sm} aria-hidden />
        </button>
      )}

      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={t('lists.summary.sortMenuAria')}>
          {sortKeys.map((key) => (
            <MenuItem
              key={key}
              selected={key === filters.sortBy}
              onClick={() => {
                filters.selectSort(key);
                menu.close();
              }}
            >
              {t(SORT_LABEL_KEYS[key])}
            </MenuItem>
          ))}
          <MenuSeparator />
          <MenuLabel>{t('lists.summary.sortOrder')}</MenuLabel>
          {directionsOf(filters.sortBy).map((direction) => (
            <MenuItem
              key={direction}
              selected={direction === filters.sortDir}
              onClick={() => {
                filters.setSortDir(direction);
                menu.close();
              }}
            >
              {t(DIRECTION_LABEL_KEYS[filters.sortBy][direction])}
            </MenuItem>
          ))}
        </MenuPanel>
      ) : null}
    </div>
  );
}
