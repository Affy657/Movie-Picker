import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import MoviePreviewRow, { MoviePreviewRail } from '@/features/movies/components/MoviePreviewRow';
import MovieBrowseCard from '@/features/movies/components/MovieBrowseCard';
import LazyMovieDetailsModal from '@/features/movies/components/LazyMovieDetailsModal';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useWatchlistToggle } from '@/features/watchlist/hooks/useWatchlistToggle';
import ProposeToEventModal from '@/features/watchlist/components/ProposeToEventModal';
import {
  fetchUserWatchedMovies,
  type UserWatchedMovieItem,
} from '@/features/profile/api/profileApi';
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
  const [detailsTarget, setDetailsTarget] = useState<UserWatchedMovieItem | null>(null);
  const [proposeTarget, setProposeTarget] = useState<UserWatchedMovieItem | null>(null);
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const hasHover = useHasHoverCapability();
  const watchlist = useWatchlistToggle(isLoggedIn);

  const items = query.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <>
      {watchlist.error ? (
        <p className="error" role="alert">
          {watchlist.error}
        </p>
      ) : null}
      <Card padding="lg" radius="lg">
        <MoviePreviewRow
          heading={t('profile.movies.title')}
          seeAllTo={ROUTES.profileMovies(handle)}
          seeAllLabel={t('profile.movies.seeAll')}
        >
          <MoviePreviewRail itemCount={items.length}>
            {items.map((item) => (
              <MovieBrowseCard
                key={`${item.tmdbId}|${item.mediaType}|${item.watchedAt}`}
                item={item}
                hasHover={hasHover}
                isLoggedIn={isLoggedIn}
                inWatchlist={watchlist.has(item)}
                onToggleWatchlist={() => watchlist.toggle(item)}
                onProposeToEvent={() => setProposeTarget(item)}
                onOpenDetails={() => setDetailsTarget(item)}
              />
            ))}
          </MoviePreviewRail>
        </MoviePreviewRow>
      </Card>

      {detailsTarget ? (
        <LazyMovieDetailsModal
          open
          title={detailsTarget.title}
          year={detailsTarget.year}
          tmdbId={detailsTarget.tmdbId}
          mediaType={detailsTarget.mediaType}
          posterSrc={posterImageSrc(detailsTarget.posterPath)}
          libraryContext={
            isLoggedIn
              ? {
                  inWatchlist: watchlist.has(detailsTarget),
                  onToggleWatchlist: () => watchlist.toggle(detailsTarget),
                  onProposeToEvent: () => setProposeTarget(detailsTarget),
                }
              : undefined
          }
          onClose={() => setDetailsTarget(null)}
        />
      ) : null}

      {proposeTarget ? (
        <ProposeToEventModal open movie={proposeTarget} onClose={() => setProposeTarget(null)} />
      ) : null}
    </>
  );
}
