import { useState } from 'react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import MoviePreviewRow from '@/features/movies/components/MoviePreviewRow';
import MovieBrowseCard, {
  type MovieLibraryActions,
} from '@/features/movies/components/MovieBrowseCard';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import {
  useWatchlistToggle,
  type WatchlistToggleItem,
} from '@/features/watchlist/hooks/useWatchlistToggle';
import ProposeToEventModal from '@/features/events/components/ProposeToEventModal';
import { useOpenMoviePage } from '@/features/movies/hooks/useOpenMoviePage';
import {
  WATCHED_MOVIES_TAKE,
  fetchUserWatchedMovieItems,
  type UserWatchedMovieItem,
} from '@/features/profile/api/profileApi';
import OwnerRatingBadge from '@/features/profile/components/OwnerRatingBadge';
import ProfileFavoritesSection from '@/features/profile/components/ProfileFavoritesSection';
import ProfileWatchlistPreview from '@/features/profile/components/ProfileWatchlistPreview';
import type { FavoriteTitle } from '@/shared/types/movie';
import styles from './ProfileMoviesSection.module.css';

const WATCHED_PREVIEW_COUNT = 8;

interface WatchlistSummary {
  count: number;
  isHidden: boolean;
}

interface Props {
  handle: string;
  favorites?: readonly FavoriteTitle[];
  isOwnProfile?: boolean;
  watchlist?: WatchlistSummary | null;
}

function latestViewingOfEachTitle(items: readonly UserWatchedMovieItem[]): UserWatchedMovieItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.mediaType}|${item.tmdbId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function ProfileMoviesSection({
  handle,
  favorites = [],
  isOwnProfile = false,
  watchlist = null,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: queryKeys.profile.watchedMovies(handle, WATCHED_MOVIES_TAKE),
    queryFn: ({ signal }) => fetchUserWatchedMovieItems(handle, signal),
  });
  const openMoviePage = useOpenMoviePage();
  const [proposeTarget, setProposeTarget] = useState<WatchlistToggleItem | null>(null);
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const hasHover = useHasHoverCapability();
  const isMobile = useIsMobile();
  const watchlistToggle = useWatchlistToggle(isLoggedIn);

  const library: MovieLibraryActions = {
    hasHover,
    isLoggedIn,
    has: watchlistToggle.has,
    toggle: watchlistToggle.toggle,
    propose: setProposeTarget,
  };

  const items = query.data ?? [];
  const watched = latestViewingOfEachTitle(items).slice(0, WATCHED_PREVIEW_COUNT);
  const showFavorites = favorites.length > 0 || isOwnProfile;
  const showWatchlist = !!watchlist && (isOwnProfile || watchlist.count > 0);
  if (items.length === 0 && !showFavorites && !showWatchlist) return null;

  return (
    <div className={styles.movies}>
      {watchlistToggle.error ? (
        <p className="error" role="alert">
          {watchlistToggle.error}
        </p>
      ) : null}

      {showFavorites || showWatchlist ? (
        <div className={clsx(styles.shelf, showFavorites && showWatchlist && styles.shelfSplit)}>
          {showFavorites && (
            <ProfileFavoritesSection
              favorites={favorites}
              isOwnProfile={isOwnProfile}
              library={library}
              ratingScale={user?.ratingScale}
              onOpenDetails={(item) => openMoviePage(item)}
            />
          )}
          {showWatchlist && watchlist && (
            <div className={styles.watchlistSlot}>
              <ProfileWatchlistPreview
                handle={handle}
                count={watchlist.count}
                isHidden={watchlist.isHidden}
                isOwnProfile={isOwnProfile}
                isMobile={isMobile}
                wide={!showFavorites}
                library={library}
                ratingScale={user?.ratingScale}
                onOpenDetails={(item) => openMoviePage(item)}
              />
            </div>
          )}
        </div>
      ) : null}

      {watched.length > 0 ? (
        <MoviePreviewRow
          heading={t('profile.movies.title')}
          headingCount={items.length}
          seeAllTo={ROUTES.profileMovies(handle)}
          seeAllLabel={t('profile.movies.seeAll')}
        >
          <ul className={styles.watchedGrid}>
            {watched.map((item) => (
              <MovieBrowseCard
                key={`${item.tmdbId}|${item.mediaType}|${item.watchedAt}`}
                item={item}
                ratingScale={user?.ratingScale}
                hasHover={hasHover}
                isLoggedIn={isLoggedIn}
                inWatchlist={watchlistToggle.has(item)}
                onToggleWatchlist={() => watchlistToggle.toggle(item)}
                onProposeToEvent={() => setProposeTarget(item)}
                onOpenDetails={() => openMoviePage(item)}
                leadingBadge={
                  item.myRating != null ? (
                    <OwnerRatingBadge
                      handle={handle}
                      value={item.myRating}
                      scale={user?.ratingScale ?? 'five'}
                    />
                  ) : undefined
                }
              />
            ))}
          </ul>
        </MoviePreviewRow>
      ) : null}

      {proposeTarget ? (
        <ProposeToEventModal open movie={proposeTarget} onClose={() => setProposeTarget(null)} />
      ) : null}
    </div>
  );
}
