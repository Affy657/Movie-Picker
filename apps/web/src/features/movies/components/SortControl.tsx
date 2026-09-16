import { ArrowDown, ArrowUp } from 'lucide-react';
import clsx from 'clsx';
import Menu, { MenuItem, MenuLabel, MenuSeparator } from '@/shared/components/Menu';
import Chip from '@/shared/components/Chip';
import styles from './SortControl.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

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
          triggerIcon={<DirectionIcon size={ICON_SIZE.xs} aria-hidden />}
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
                icon={<DirectionIcon size={ICON_SIZE.sm} aria-hidden />}
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
      {sortOptions.map((opt) => {
        const isActive = sortBy === opt.key;
        return (
          <Chip
            key={opt.key}
            icon={isActive ? DirectionIcon : undefined}
            selected={isActive}
            onClick={() => onSetSort(opt.key)}
          >
            {opt.label}
          </Chip>
        );
      })}
    </span>
  );
}
