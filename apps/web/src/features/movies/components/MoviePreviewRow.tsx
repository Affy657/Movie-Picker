import { useId, useRef, type ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import { useRailScroll } from '@/shared/hooks/useRailScroll';
import styles from './MoviePreviewRow.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import IconButton from '@/shared/components/IconButton';

export type MoviePreviewRowSize = 'sm' | 'md' | 'wide' | 'ranked';

const RAIL_SIZE_CLASS: Record<MoviePreviewRowSize, string | undefined> = {
  sm: undefined,
  md: styles.railMd,
  wide: styles.railWide,
  ranked: styles.railRanked,
};

interface RailProps {
  size?: MoviePreviewRowSize;
  itemCount: number;
  label?: string;
  children: ReactNode;
}

export function MoviePreviewRail({ size = 'sm', itemCount, label, children }: Readonly<RailProps>) {
  const { t } = useTranslation();
  const railRef = useRef<HTMLUListElement>(null);
  const { canScrollBack, canScrollForward, scrollByPage } = useRailScroll(railRef, itemCount);
  const scrollable = canScrollBack || canScrollForward;

  return (
    <div
      className={clsx(
        styles.railViewport,
        (size === 'md' || size === 'ranked') && styles.railViewportMd,
        size === 'wide' && styles.railViewportWide
      )}
    >
      <ul
        ref={railRef}
        className={clsx(styles.rail, RAIL_SIZE_CLASS[size])}
        aria-label={label}
        data-testid="movie-preview-rail"
      >
        {children}
      </ul>
      {scrollable ? (
        <>
          <IconButton
            tone="onPoster"
            shape="round"
            showTitle={false}
            className={clsx(styles.railArrow, styles.railArrowBack)}
            onClick={() => scrollByPage(-1)}
            disabled={!canScrollBack}
            ariaLabel={t('showcase.railScrollBack')}
          >
            <ChevronLeft size={ICON_SIZE.xl} aria-hidden />
          </IconButton>
          <IconButton
            tone="onPoster"
            shape="round"
            showTitle={false}
            className={clsx(styles.railArrow, styles.railArrowForward)}
            onClick={() => scrollByPage(1)}
            disabled={!canScrollForward}
            ariaLabel={t('showcase.railScrollForward')}
          >
            <ChevronRight size={ICON_SIZE.xl} aria-hidden />
          </IconButton>
        </>
      ) : null}
    </div>
  );
}

interface RowProps {
  heading: string;
  headingLevel?: 2 | 3;
  headingCount?: number;
  subtitle?: string;
  seeAllTo?: string;
  seeAllLabel?: string;
  toolbar?: ReactNode;
  className?: string;
  children: ReactNode;
}

export default function MoviePreviewRow({
  heading,
  headingLevel = 2,
  headingCount,
  subtitle,
  seeAllTo,
  seeAllLabel,
  toolbar,
  className,
  children,
}: Readonly<RowProps>) {
  const headingId = useId();
  const seeAllId = useId();
  const Heading = headingLevel === 3 ? 'h3' : 'h2';

  return (
    <section className={clsx(styles.section, className)} aria-labelledby={headingId}>
      <div className={styles.headerRow}>
        <div className={styles.headings}>
          <Heading id={headingId} className={styles.heading}>
            {heading}
            {headingCount === undefined ? null : (
              <>
                {' '}
                <span className={styles.headingCount}>{headingCount}</span>
              </>
            )}
          </Heading>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {seeAllTo && seeAllLabel ? (
          <Link
            id={seeAllId}
            to={seeAllTo}
            className={styles.seeAllLink}
            aria-labelledby={`${seeAllId} ${headingId}`}
          >
            {seeAllLabel}
            <ChevronRight size={ICON_SIZE.sm} className={styles.seeAllChevron} aria-hidden />
          </Link>
        ) : null}
      </div>
      {toolbar}
      {children}
    </section>
  );
}
