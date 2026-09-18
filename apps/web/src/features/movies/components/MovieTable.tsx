import type { ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, Film } from 'lucide-react';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import { OverflowChip, PaidOfferChip } from '@/features/movies/components/movieCardParts';
import type { WatchProviderOffer } from '@/shared/types/movie';
import { ICON_SIZE } from '@/shared/components/iconSize';
import Card from '@/shared/components/Card';
import styles from './MovieTable.module.css';
import type { Translate } from '@/shared/i18n';

export function MovieTable({
  header,
  listLabel,
  className,
  children,
}: Readonly<{
  header?: ReactNode;
  listLabel?: string;
  className?: string;
  children: ReactNode;
}>) {
  return (
    <Card padding="none" className={clsx(styles.table, className)}>
      {header}
      <ul className={styles.rows} aria-label={listLabel}>
        {children}
      </ul>
    </Card>
  );
}

export interface MovieTableSort<K extends string> {
  key: K;
  label: string;
}

export interface MovieTableColumn<K extends string> {
  sorts?: MovieTableSort<K>[];
  align?: 'start' | 'end' | 'center';
  inset?: boolean;
}

const ALIGN_CLASS = {
  start: styles.colHeaderStart,
  end: styles.colHeaderEnd,
  center: styles.colHeaderCenter,
} as const;

export function MovieTableHeader<K extends string>({
  columns,
  sortBy,
  sortDir,
  onSetSort,
  gridClassName,
}: Readonly<{
  columns: MovieTableColumn<K>[];
  sortBy: K;
  sortDir: 'asc' | 'desc';
  onSetSort: (key: K) => void;
  gridClassName?: string;
}>) {
  const DirectionIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div className={clsx(styles.headerRow, gridClassName)}>
      {columns.map((column, index) => {
        const sorts = column.sorts ?? [];
        if (sorts.length === 0) return <span key={index} />;
        return (
          <span
            key={index}
            className={clsx(
              styles.colHeaderCell,
              ALIGN_CLASS[column.align ?? 'start'],
              column.inset && styles.colHeaderInset
            )}
          >
            {sorts.map((sort) => {
              const active = sortBy === sort.key;
              return (
                <button
                  key={sort.key}
                  type="button"
                  className={clsx(styles.colHeaderBtn, active && styles.colHeaderBtnActive)}
                  aria-pressed={active}
                  onClick={() => onSetSort(sort.key)}
                >
                  <span>{sort.label}</span>
                  {active ? <DirectionIcon aria-hidden size={ICON_SIZE.xs} /> : null}
                </button>
              );
            })}
          </span>
        );
      })}
    </div>
  );
}

export function MovieTablePoster({
  src,
  srcSet,
  eager,
}: Readonly<{ src: string | null | undefined; srcSet?: string; eager: boolean }>) {
  if (!src) {
    return (
      <div className={styles.posterPlaceholder} aria-hidden>
        <Film size={ICON_SIZE.xl} />
      </div>
    );
  }
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes="(max-width: 767px) 80px, 64px"
      alt=""
      className={styles.poster}
      width={64}
      height={96}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
    />
  );
}

export function MovieTableAvailability({
  flatrateProviders,
  rentCount,
  buyCount,
  watchPageUrl,
  maxVisible,
  chipMaxWidth,
  onMoreClick,
  emptyLabel,
  title,
  t,
}: Readonly<{
  flatrateProviders: WatchProviderOffer[] | undefined;
  rentCount: number;
  buyCount: number;
  watchPageUrl?: string | null;
  maxVisible: number;
  chipMaxWidth?: string;
  onMoreClick: () => void;
  emptyLabel: string;
  title: string;
  t: Translate;
}>) {
  const total = (flatrateProviders?.length ?? 0) + rentCount + buyCount;
  if (total === 0) {
    return <span className={styles.availabilityEmpty}>{emptyLabel}</span>;
  }

  const visibleFlatrate = (flatrateProviders ?? []).slice(0, maxVisible);
  const hidden = total - visibleFlatrate.length;

  let overflow: ReactNode = null;
  if (hidden > 0) {
    if (visibleFlatrate.length === 0 && rentCount > 0 && buyCount === 0) {
      overflow = (
        <PaidOfferChip
          type="rent"
          count={rentCount}
          onClick={onMoreClick}
          ariaLabel={t('movies.watchProviders.alsoRentAria', { count: rentCount, title })}
        />
      );
    } else if (visibleFlatrate.length === 0 && buyCount > 0 && rentCount === 0) {
      overflow = (
        <PaidOfferChip
          type="buy"
          count={buyCount}
          onClick={onMoreClick}
          ariaLabel={t('movies.watchProviders.alsoBuyAria', { count: buyCount, title })}
        />
      );
    } else {
      overflow = (
        <OverflowChip
          count={hidden}
          onClick={onMoreClick}
          ariaLabel={t('movies.watchProviders.alsoAvailableAria', { count: hidden, title })}
        />
      );
    }
  }

  return (
    <span className={styles.availabilityRow}>
      {visibleFlatrate.length > 0 && (
        <WatchProviderChips
          providers={visibleFlatrate}
          variant="compact"
          className={styles.availabilityChips}
          watchPageUrl={watchPageUrl}
          chipMaxWidth={chipMaxWidth}
          showTypeIcon={false}
        />
      )}
      {overflow}
    </span>
  );
}
