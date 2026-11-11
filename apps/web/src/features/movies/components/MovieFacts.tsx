import type { MovieData } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import { useTranslation } from '@/shared/i18n';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';

type Props = {
  movie: Pick<MovieData, 'year' | 'runtimeMinutes' | 'voteAverage'>;
  scale?: RatingScale;
  className?: string;
};

export default function MovieFacts({ movie, scale, className }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const runtime = formatRuntimeMinutes(movie.runtimeMinutes);
  const vote = formatTmdbVote(movie.voteAverage, scale, locale);
  if (!movie.year && !runtime && !vote) return null;
  return (
    <span className={className}>
      {movie.year ? <span>{movie.year}</span> : null}
      {runtime ? <span title={t('movies.list.runtimeTitle')}>{runtime}</span> : null}
      {vote ? <span title={t('movies.list.tmdbVoteTitle')}>{vote}</span> : null}
    </span>
  );
}
