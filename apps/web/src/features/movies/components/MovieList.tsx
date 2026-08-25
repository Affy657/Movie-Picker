import clsx from 'clsx';
import { Film } from 'lucide-react';
import EmptyState from '@/shared/components/EmptyState';
import type { MovieData } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import { useTranslation } from '@/shared/i18n';
import { MovieCardGrid } from '@/features/movies/components/MovieCardGrid';
import { MovieCardList } from '@/features/movies/components/MovieCardList';
import type { MovieCardSelection } from '@/features/movies/components/movieCardParts';
import styles from './MovieList.module.css';

export { MovieCardGrid as MovieCard } from '@/features/movies/components/MovieCardGrid';

interface MovieListProps {
  movies: MovieData[];
  slug: string;
  participantId: string | null;
  participantPseudo: string | null;
  isFinished: boolean;
  isHost?: boolean;
  onVote: (movieId: string, value: 1 | -1) => Promise<void>;
  onRemove: (movieId: string) => Promise<void>;
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
  winnerMovieId?: string;
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
  winnerMovieId,
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

  const Card = viewMode === 'list' ? MovieCardList : MovieCardGrid;

  return (
    <div>
      <ul className={clsx(styles.list, viewMode === 'list' && styles.listView)}>
        {movies.map((m, i) => (
          <Card
            key={m.id}
            movie={m}
            slug={slug}
            participantId={participantId}
            participantPseudo={participantPseudo}
            isFinished={isFinished}
            isHost={isHost}
            eager={i < 3}
            onVote={onVote}
            onRemove={onRemove}
            refresh={refresh}
            onActionError={onActionError}
            participantAvatars={participantAvatars}
            participantAvatarsByPseudo={participantAvatarsByPseudo}
            ratingScale={ratingScale}
            isInWatchlist={isInWatchlist?.(m)}
            onToggleWatchlist={onToggleWatchlist}
            onToggleWheelExclusion={onToggleWheelExclusion}
            selection={selection}
            isWinner={m.id === winnerMovieId}
            t={t}
          />
        ))}
      </ul>
    </div>
  );
}
