import { ArrowDown, ArrowUp } from 'lucide-react';
import clsx from 'clsx';
import Menu, { MenuItem, MenuLabel, MenuSeparator } from '@/shared/components/Menu';
import styles from './SortControl.module.css';

export interface SortOption<TSortKey extends string> {
  key: TSortKey;
  label: string;
}

export interface SortControlProps<TSortKey extends string> {
  sortOptions: SortOption<TSortKey>[];
  sortBy: TSortKey;
  sortDir: 'asc' | 'desc';
  onSetSort: (key: TSortKey) => void;
  sortLabel: string;
  sortMenuAriaLabel: string;
  sortDirectionAscLabel: string;
  sortDirectionDescLabel: string;
  isMobile: boolean;
  className?: string;
}

export default function SortControl<TSortKey extends string>({
  sortOptions,
  sortBy,
  sortDir,
  onSetSort,
  sortLabel,
  sortMenuAriaLabel,
  sortDirectionAscLabel,
  sortDirectionDescLabel,
  isMobile,
  className,
}: Readonly<SortControlProps<TSortKey>>) {
  const DirectionIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;
  const activeSort = sortOptions.find((opt) => opt.key === sortBy) ?? sortOptions[0];

  if (isMobile) {
    return (
      <span className={clsx(styles.menuWrap, className)}>
        <Menu
          triggerLabel={activeSort?.label ?? ''}
          triggerIcon={<DirectionIcon size={12} aria-hidden />}
          triggerClassName={styles.menuTrigger}
          panelClassName={styles.menuPanel}
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
    );
  }

  return (
    <span className={clsx(styles.pillsRow, className)} role="toolbar" aria-label={sortLabel}>
      <span className={styles.label}>{sortLabel}</span>
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
  );
}
