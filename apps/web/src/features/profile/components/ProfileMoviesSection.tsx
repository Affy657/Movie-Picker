import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import MoviePreviewRow, { MoviePreviewRail } from '@/features/movies/components/MoviePreviewRow';
import MoviePosterCard from '@/features/movies/components/MoviePosterCard';
import { fetchUserWatchedMovies } from '@/features/profile/api/profileApi';
import Card from '@/shared/components/Card';

const PREVIEW_TAKE = 6;

interface Props {
  handle: string;
}

export default function ProfileMoviesSection({ handle }: Readonly<Props>) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: queryKeys.profile.watchedMovies(handle, PREVIEW_TAKE),
    queryFn: ({ signal }) => fetchUserWatchedMovies(handle, PREVIEW_TAKE, signal),
  });

  const items = query.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <Card padding="lg" radius="lg">
      <MoviePreviewRow
        heading={t('profile.movies.title')}
        seeAllTo={ROUTES.profileMovies(handle)}
        seeAllLabel={t('profile.movies.seeAll')}
      >
        <MoviePreviewRail itemCount={items.length}>
          {items.map((item) => {
            const posterRaw = posterImageSrc(item.posterPath);
            return (
              <MoviePosterCard
                key={`${item.tmdbId}|${item.mediaType}|${item.watchedAt}`}
                title={item.title}
                meta={item.year}
                posterSrc={posterRaw ? tmdbPosterSrcForListDisplay(posterRaw) : undefined}
              />
            );
          })}
        </MoviePreviewRail>
      </MoviePreviewRow>
    </Card>
  );
}
