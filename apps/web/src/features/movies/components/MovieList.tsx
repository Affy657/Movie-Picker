import type { ReactNode } from 'react';
import type { MovieData } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import { useTranslation } from '@/shared/i18n';
import { EventMovieCard } from '@/features/movies/components/EventMovieCard';
import { EventMovieRow, EventMovieRowHeader } from '@/features/movies/components/EventMovieRow';
import { MovieTable } from '@/features/movies/components/MovieTable';
import type { MovieCardSelection } from '@/features/movies/components/movieCardParts';
import styles from './MovieList.module.css';

export type MovieRowSortKey =
  'createdAt' | 'voteAverage' | 'duration' | 'score' | 'availability' | 'seen' | 'releaseDate';

interface MovieListProps {
  movies: MovieData[];
  slug: string;
  participantId: string | null;
  canVote?: boolean;
  participantPseudo: string | null;
  isFinished: boolean;
  wheelLocked?: boolean;
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
  voteQuotaLockedHint?: string | null;
  isMobile: boolean;
  showRank?: boolean;
  showHeader?: boolean;
  sortBy?: MovieRowSortKey;
  sortDir?: 'asc' | 'desc';
  onSetSort?: (key: MovieRowSortKey) => void;
  voteErrors?: Record<string, { message: string }>;
  onRetryVote?: (movieId: string) => void;
  participantCount?: number;
  emptyState?: ReactNode;
}

export default function MovieList({
  movies,
  slug,
  participantId,
  canVote,
  participantPseudo,
  isFinished,
  wheelLocked = false,
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
  voteQuotaLockedHint = null,
  isMobile,
  showRank = false,
  showHeader = true,
  sortBy,
  sortDir,
  onSetSort,
  voteErrors,
  onRetryVote,
  participantCount,
  emptyState = null,
}: Readonly<MovieListProps>) {
  const { t } = useTranslation();

  if (movies.length === 0) return emptyState;

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
    canVote,
    participantPseudo,
    isFinished,
    wheelLocked,
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
    voteLockedHint: voteQuotaLockedHint && m.myVote == null ? voteQuotaLockedHint : undefined,
    isMobile,
    participantCount,
    t,
  });

  if (viewMode === 'list') {
    return (
      <MovieTable
        header={
          !isMobile && showHeader && sortBy && sortDir && onSetSort ? (
            <EventMovieRowHeader
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
          ) : null
        }
      >
        {movies.map((m, i) => {
          const rowError = voteErrors?.[m.id];
          return (
            <EventMovieRow
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
      </MovieTable>
    );
  }

  return (
    <ul className={styles.grid}>
      {movies.map((m, i) => (
        <EventMovieCard key={m.id} {...commonCardProps(m)} eager={i < 3} />
      ))}
    </ul>
  );
}
