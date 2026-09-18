import type { ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import type { RatingScale } from '@/shared/types/theme';
import {
  MovieTableHeader,
  MovieTablePoster,
  type MovieTableColumn,
  type MovieTableSort,
} from '@/features/movies/components/MovieTable';
import { ICON_SIZE } from '@/shared/components/iconSize';
import table from './MovieTable.module.css';
import styles from './LibraryMovieRow.module.css';

export interface LibraryMovieRowSorts<K extends string> {
  title: MovieTableSort<K>[];
  vote?: MovieTableSort<K>;
  runtime?: MovieTableSort<K>;
  year?: MovieTableSort<K>;
  availability?: MovieTableSort<K>;
}

export function LibraryMovieRowHeader<K extends string>({
  sorts,
  sortBy,
  sortDir,
  onSetSort,
}: Readonly<{
  sorts: LibraryMovieRowSorts<K>;
  sortBy: K;
  sortDir: 'asc' | 'desc';
  onSetSort: (key: K) => void;
}>) {
  const single = (sort?: MovieTableSort<K>) => (sort ? [sort] : []);
  const columns: MovieTableColumn<K>[] = [
    {},
    { sorts: sorts.title, inset: true },
    { sorts: single(sorts.vote), align: 'end' },
    { sorts: single(sorts.runtime), align: 'end' },
    { sorts: single(sorts.year), align: 'end' },
    { sorts: single(sorts.availability), inset: true },
    {},
  ];
  return (
    <MovieTableHeader
      columns={columns}
      sortBy={sortBy}
      sortDir={sortDir}
      onSetSort={onSetSort}
      gridClassName={styles.rowGrid}
    />
  );
}

interface LibraryMovieRowProps {
  title: string;
  year?: string;
  posterPath: string | null;
  voteAverage?: number | null;
  ratingScale?: RatingScale;
  runtimeMinutes?: number | null;
  genres?: string[];
  badge?: ReactNode;
  availability?: ReactNode;
  eager?: boolean;
  isMobile?: boolean;
  onOpenDetails: () => void;
  kebab?: ReactNode;
}

export default function LibraryMovieRow({
  title,
  year,
  posterPath,
  voteAverage,
  ratingScale,
  runtimeMinutes,
  genres = [],
  badge,
  availability,
  eager = false,
  isMobile = false,
  onOpenDetails,
  kebab,
}: Readonly<LibraryMovieRowProps>) {
  const { t } = useTranslation();
  const posterSrc = posterImageSrc(posterPath);
  const posterSrcSet = tmdbPosterSrcSetForList(posterSrc);
  const voteLabel = formatTmdbVote(voteAverage, ratingScale);
  const runtimeLabel = formatRuntimeMinutes(runtimeMinutes);
  const hasMeta = badge != null || genres.length > 0;

  const trigger = (
    <button
      type="button"
      className={styles.rowTrigger}
      onClick={onOpenDetails}
      aria-label={t('movies.card.openDetailsAria', { title })}
    />
  );
  const heading = (
    <h3 className={table.title} title={title}>
      {title}
    </h3>
  );
  const meta = hasMeta ? (
    <>
      {badge != null ? <span className={styles.badge}>{badge}</span> : null}
      {genres.length > 0 ? <span className={styles.genres}>{genres.join(', ')}</span> : null}
    </>
  ) : null;

  if (isMobile) {
    return (
      <li className={table.mobileRow}>
        {trigger}
        <div className={table.mobilePosterCol}>
          <MovieTablePoster src={posterSrc} srcSet={posterSrcSet} eager={eager} />
        </div>
        <div className={table.mobileContent}>
          <div className={table.mobileTitleRow}>{heading}</div>
          <div className={table.mobileFacts}>
            {year ? <span>{year}</span> : null}
            {runtimeLabel ? <span>{runtimeLabel}</span> : null}
            {voteLabel ? <span>{voteLabel}</span> : null}
            {availability ? <span className={styles.aboveTrigger}>{availability}</span> : null}
          </div>
          {meta ? <div className={clsx(table.metaRow, styles.mobileMeta)}>{meta}</div> : null}
        </div>
        <span className={table.disclosure} aria-hidden>
          <ChevronRight size={ICON_SIZE.md} />
        </span>
      </li>
    );
  }

  return (
    <li className={clsx(table.row, styles.rowGrid, styles.rowHoverable)}>
      {trigger}
      <div className={table.posterCol}>
        <MovieTablePoster src={posterSrc} srcSet={posterSrcSet} eager={eager} />
      </div>
      <div className={table.titleCol}>
        <div className={table.titleRow}>{heading}</div>
        {meta ? <div className={table.metaRow}>{meta}</div> : null}
      </div>
      <span className={table.cellEnd}>{voteLabel}</span>
      <span className={table.cellEnd}>{runtimeLabel}</span>
      <span className={table.cellEnd}>{year}</span>
      <div className={clsx(table.availabilityCol, styles.aboveTrigger)}>{availability}</div>
      <div className={clsx(table.kebabCol, styles.aboveTrigger)}>{kebab}</div>
    </li>
  );
}
