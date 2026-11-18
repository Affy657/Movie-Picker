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

function rowGridClass(hasContributorColumn: boolean): string | undefined {
  return hasContributorColumn ? styles.rowGridWithContributor : styles.rowGrid;
}

export function LibraryMovieRowHeader<K extends string>({
  sorts,
  sortBy,
  sortDir,
  onSetSort,
  contributorLabel,
}: Readonly<{
  sorts: LibraryMovieRowSorts<K>;
  sortBy: K;
  sortDir: 'asc' | 'desc';
  onSetSort: (key: K) => void;
  contributorLabel?: string;
}>) {
  const single = (sort?: MovieTableSort<K>) => (sort ? [sort] : []);
  const columns: MovieTableColumn<K>[] = [
    { id: 'poster' },
    { id: 'title', sorts: sorts.title, inset: true },
    { id: 'vote', sorts: single(sorts.vote), align: 'end' },
    { id: 'runtime', sorts: single(sorts.runtime), align: 'end' },
    { id: 'year', sorts: single(sorts.year), align: 'end' },
    ...(contributorLabel ? [{ id: 'contributor', label: contributorLabel, inset: true }] : []),
    { id: 'availability', sorts: single(sorts.availability), inset: true },
    { id: 'actions' },
  ];
  return (
    <MovieTableHeader
      columns={columns}
      sortBy={sortBy}
      sortDir={sortDir}
      onSetSort={onSetSort}
      gridClassName={rowGridClass(contributorLabel !== undefined)}
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
  dimmed?: boolean;
  contributor?: ReactNode | null;
}

function LibraryRowMeta({ badge, genres }: Readonly<{ badge?: ReactNode; genres: string[] }>) {
  return (
    <>
      {badge != null ? <span className={styles.badge}>{badge}</span> : null}
      {genres.length > 0 ? <span className={styles.genres}>{genres.join(', ')}</span> : null}
    </>
  );
}

function MobileFacts({
  year,
  runtimeLabel,
  voteLabel,
  availability,
  contributor,
}: Readonly<{
  year?: string;
  runtimeLabel: string | null;
  voteLabel: string | null;
  availability?: ReactNode;
  contributor?: ReactNode;
}>) {
  return (
    <div className={table.mobileFacts}>
      {year ? <span>{year}</span> : null}
      {runtimeLabel ? <span>{runtimeLabel}</span> : null}
      {voteLabel ? <span>{voteLabel}</span> : null}
      {contributor ? <span>{contributor}</span> : null}
      {availability ? <span className={styles.aboveTrigger}>{availability}</span> : null}
    </div>
  );
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
  dimmed = false,
  contributor,
}: Readonly<LibraryMovieRowProps>) {
  const hasContributorColumn = contributor !== undefined;
  const { t, locale } = useTranslation();
  const posterSrc = posterImageSrc(posterPath);
  const posterSrcSet = tmdbPosterSrcSetForList(posterSrc);
  const voteLabel = formatTmdbVote(voteAverage, ratingScale, locale);
  const runtimeLabel = formatRuntimeMinutes(runtimeMinutes);
  const hasMeta = badge != null || genres.length > 0;

  const trigger = (
    <button
      type="button"
      className={styles.rowTrigger}
      onClick={onOpenDetails}
      aria-label={t(dimmed ? 'movies.card.openDetailsSeenAria' : 'movies.card.openDetailsAria', {
        title,
      })}
    />
  );
  const heading = (
    <h3 className={table.title} title={title}>
      {title}
    </h3>
  );
  const meta = hasMeta ? <LibraryRowMeta badge={badge} genres={genres} /> : null;

  if (isMobile) {
    return (
      <li className={clsx(table.mobileRow, dimmed && styles.dimmed)}>
        {trigger}
        <div className={table.mobilePosterCol}>
          <MovieTablePoster src={posterSrc} srcSet={posterSrcSet} eager={eager} />
        </div>
        <div className={table.mobileContent}>
          <div className={table.mobileTitleRow}>{heading}</div>
          <MobileFacts
            year={year}
            runtimeLabel={runtimeLabel}
            voteLabel={voteLabel}
            availability={availability}
            contributor={contributor}
          />
          {meta ? <div className={clsx(table.metaRow, styles.mobileMeta)}>{meta}</div> : null}
        </div>
        <span className={table.disclosure} aria-hidden>
          <ChevronRight size={ICON_SIZE.md} />
        </span>
      </li>
    );
  }

  return (
    <li
      className={clsx(
        table.row,
        rowGridClass(hasContributorColumn),
        styles.rowHoverable,
        dimmed && styles.dimmed
      )}
    >
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
      {hasContributorColumn ? <div className={styles.contributorCol}>{contributor}</div> : null}
      <div className={clsx(table.availabilityCol, styles.aboveTrigger)}>{availability}</div>
      <div className={clsx(table.kebabCol, styles.aboveTrigger)}>{kebab}</div>
    </li>
  );
}
