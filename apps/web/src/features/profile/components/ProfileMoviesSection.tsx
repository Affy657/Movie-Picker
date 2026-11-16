import { useState } from 'react';
import clsx from 'clsx';
import { ROUTES } from '@/app/routes';
import InlineError from '@/shared/components/InlineError';
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
import type { UserWatchedMovieItem } from '@/features/profile/api/profileApi';
import { useProfileWatchedPreview } from '@/features/profile/hooks/useProfileWatchedPreview';
import OwnerRatingBadge from '@/features/profile/components/OwnerRatingBadge';
import ProfileFavoritesSection from '@/features/profile/components/ProfileFavoritesSection';
import ProfileHiddenNotice from '@/features/profile/components/ProfileHiddenNotice';
import ProfileWatchlistPreview from '@/features/profile/components/ProfileWatchlistPreview';
import type { FavoriteTitle } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
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
  watchedVisible?: boolean;
  watchedHidden?: boolean;
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

const NO_WATCHED: readonly UserWatchedMovieItem[] = [];

function useVisibleWatchedPreview(handle: string, visible: boolean) {
  const query = useProfileWatchedPreview(handle, visible);
  return {
    items: (visible && query.data?.items) || NO_WATCHED,
    total: query.data?.total,
    failed: visible && query.isLoadingError,
    retry: () => void query.refetch(),
  };
}

function WatchedPreviewRow({
  handle,
  items,
  total,
  hidden,
  library,
  ratingScale,
  onOpenDetails,
}: Readonly<{
  handle: string;
  items: readonly UserWatchedMovieItem[];
  total: number | undefined;
  hidden: boolean;
  library: MovieLibraryActions;
  ratingScale: RatingScale | undefined;
  onOpenDetails: (item: UserWatchedMovieItem) => void;
}>) {
  const { t } = useTranslation();
  return (
    <MoviePreviewRow
      heading={t('profile.movies.title')}
      headingCount={total}
      seeAllTo={ROUTES.profileMovies(handle)}
      seeAllLabel={t('profile.movies.seeAll')}
      toolbar={
        hidden ? (
          <ProfileHiddenNotice
            label={t('profile.movies.hidden')}
            to={ROUTES.watchedMovies}
            className={styles.hiddenNotice}
          />
        ) : undefined
      }
    >
      <ul className={styles.watchedGrid}>
        {items.map((item) => (
          <MovieBrowseCard
            key={`${item.tmdbId}|${item.mediaType}|${item.watchedAt}`}
            item={item}
            ratingScale={ratingScale}
            hasHover={library.hasHover}
            isLoggedIn={library.isLoggedIn}
            inWatchlist={library.has(item)}
            onToggleWatchlist={() => library.toggle(item)}
            onProposeToEvent={() => library.propose(item)}
            onOpenDetails={() => onOpenDetails(item)}
            leadingBadge={
              item.myRating != null ? (
                <OwnerRatingBadge
                  handle={handle}
                  value={item.myRating}
                  scale={ratingScale ?? 'five'}
                />
              ) : undefined
            }
          />
        ))}
      </ul>
    </MoviePreviewRow>
  );
}

export default function ProfileMoviesSection({
  handle,
  favorites = [],
  isOwnProfile = false,
  watchedVisible = true,
  watchedHidden = false,
  watchlist = null,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const preview = useVisibleWatchedPreview(handle, watchedVisible);
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

  const { items, total, failed: watchedFailed, retry } = preview;
  const watched = latestViewingOfEachTitle(items).slice(0, WATCHED_PREVIEW_COUNT);
  const showFavorites = favorites.length > 0 || isOwnProfile;
  const showWatchlist = !!watchlist && (isOwnProfile || watchlist.count > 0);
  if (items.length === 0 && !watchedFailed && !showFavorites && !showWatchlist) return null;

  const watchlistInShelf = showWatchlist && !isMobile;
  const watchlistPreview =
    showWatchlist && watchlist ? (
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
    ) : null;

  return (
    <div className={styles.movies}>
      {watchlistToggle.error ? (
        <p className="error" role="alert">
          {watchlistToggle.error}
        </p>
      ) : null}

      {showFavorites || watchlistInShelf ? (
        <div className={clsx(styles.shelf, showFavorites && watchlistInShelf && styles.shelfSplit)}>
          {showFavorites && (
            <ProfileFavoritesSection
              favorites={favorites}
              isOwnProfile={isOwnProfile}
              library={library}
              ratingScale={user?.ratingScale}
              onOpenDetails={(item) => openMoviePage(item)}
            />
          )}
          {watchlistInShelf ? watchlistPreview : null}
        </div>
      ) : null}

      {watchedFailed ? (
        <InlineError
          message={t('profile.movies.previewLoadError')}
          retryLabel={t('common.retry')}
          onRetry={retry}
        />
      ) : null}

      {watched.length > 0 ? (
        <WatchedPreviewRow
          handle={handle}
          items={watched}
          total={total}
          hidden={watchedHidden}
          library={library}
          ratingScale={user?.ratingScale}
          onOpenDetails={(item) => openMoviePage(item)}
        />
      ) : null}

      {watchlistInShelf ? null : watchlistPreview}

      {proposeTarget ? (
        <ProposeToEventModal open movie={proposeTarget} onClose={() => setProposeTarget(null)} />
      ) : null}
    </div>
  );
}
