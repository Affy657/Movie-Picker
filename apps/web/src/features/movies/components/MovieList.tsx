import { Film } from 'lucide-react';
import EmptyState from '@/shared/components/EmptyState';
import type { MovieData } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import { useTranslation } from '@/shared/i18n';
import { MovieCardList } from '@/features/movies/components/MovieCardList';
import { MovieCardRow, MovieRowHeader } from '@/features/movies/components/MovieCardRow';
import type { MovieCardSelection } from '@/features/movies/components/movieCardParts';
import styles from './MovieList.module.css';

export type MovieRowSortKey =
  'createdAt' | 'voteAverage' | 'duration' | 'score' | 'availability' | 'seen' | 'releaseDate';

interface MovieListProps {
  movies: MovieData[];
  slug: string;
  participantId: string | null;
  participantPseudo: string | null;
  isFinished: boolean;
  isHost?: boolean;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  onRemove: (movie: MovieData) => void;
  refresh: () => void;
  onActionError: (message: string) => void;
  participantAvatars?: Record<string, string>;
  participantAvatarsByPseudo?: Record<string, string>;
  ratingScale?: RatingScale;
  viewMode?: 'grid' | 'list';
  isInWatchlist?: (movie: MovieData) => boolean;
  onToggleWatchlist?: (movie: MovieData) => void;
  onToggleWheelExclusion?: (movie: MovieData) => void;
  selection?: MovieCardSelection;
  winnerMovieIds?: string[];
  isMobile: boolean;
  showRank?: boolean;
  showHeader?: boolean;
  sortBy?: MovieRowSortKey;
  sortDir?: 'asc' | 'desc';
  onSetSort?: (key: MovieRowSortKey) => void;
  voteErrors?: Record<string, { message: string }>;
  onRetryVote?: (movieId: string) => void;
  participantCount?: number;
}

export default function MovieList({
  movies,
  slug,
  participantId,
  participantPseudo,
  isFinished,
  isHost = false,
  onVote,
  onRemove,
  refresh,
  onActionError,
  participantAvatars,
  participantAvatarsByPseudo,
  ratingScale,
  viewMode = 'list',
  isInWatchlist,
  onToggleWatchlist,
  onToggleWheelExclusion,
  selection,
  winnerMovieIds,
  isMobile,
  showRank = false,
  showHeader = true,
  sortBy,
  sortDir,
  onSetSort,
  voteErrors,
  onRetryVote,
  participantCount,
}: Readonly<MovieListProps>) {
  const { t } = useTranslation();

  if (movies.length === 0) {
    return (
      <EmptyState
        icon={<Film size={26} aria-hidden />}
        title={t('movies.list.emptyTitle')}
        message={t('movies.list.emptyPlaceholder')}
      />
    );
  }

  const winners = winnerMovieIds ?? [];
  const winnerRankOf = (movieId: string) => {
    const index = winners.indexOf(movieId);
    if (index < 0 || winners.length < 2) return undefined;
    return index + 1;
  };

  const listRanks = new Map<string, number>();
  let nextRank = 0;
  for (const m of movies) {
    if (winners.includes(m.id)) continue;
    nextRank += 1;
    listRanks.set(m.id, nextRank);
  }

  const commonCardProps = (m: MovieData) => ({
    movie: m,
    slug,
    participantId,
    participantPseudo,
    isFinished,
    isHost,
    onVote,
    onRemove,
    refresh,
    onActionError,
    participantAvatars,
    participantAvatarsByPseudo,
    ratingScale,
    isInWatchlist: isInWatchlist?.(m),
    onToggleWatchlist,
    onToggleWheelExclusion,
    selection,
    isWinner: winners.includes(m.id),
    winnerRank: winnerRankOf(m.id),
    isMobile,
    participantCount,
    t,
  });

  if (viewMode === 'list') {
    return (
      <div className={styles.table}>
        {!isMobile && showHeader && sortBy && sortDir && onSetSort ? (
          <MovieRowHeader
            columns={[
              { key: 'createdAt', label: t('movies.list.columnAddedAt') },
              { key: 'voteAverage', label: t('movies.list.columnTmdbVote') },
              { key: 'duration', label: t('movies.list.columnDuration') },
              { key: 'releaseDate', label: t('movies.list.columnReleaseDate') },
              { key: 'availability', label: t('movies.watchProviders.columnLabel') },
              { key: 'seen', label: t('movies.seen.columnLabel') },
              { key: 'score', label: t('movies.list.columnScore') },
            ]}
            sortBy={sortBy}
            sortDir={sortDir}
            onSetSort={onSetSort}
          />
        ) : null}
        <ul className={styles.rows}>
          {movies.map((m, i) => {
            const rowError = voteErrors?.[m.id];
            return (
              <MovieCardRow
                key={m.id}
                {...commonCardProps(m)}
                eager={i < 3}
                rank={showRank ? listRanks.get(m.id) : undefined}
                voteError={
                  rowError
                    ? { message: rowError.message, onRetry: () => onRetryVote?.(m.id) }
                    : undefined
                }
              />
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <ul className={styles.grid}>
      {movies.map((m, i) => (
        <MovieCardList key={m.id} {...commonCardProps(m)} eager={i < 3} />
      ))}
    </ul>
  );
}
