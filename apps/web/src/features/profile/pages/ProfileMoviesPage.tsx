import { useMemo } from 'react';
import { useParams } from 'react-router';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import {
  WATCHED_MOVIES_TAKE,
  fetchUserWatchedMovieItems,
  type UserWatchedMovieItem,
} from '@/features/profile/api/profileApi';
import ProfileCollectionPage, {
  type ProfileCollectionTexts,
} from '@/features/profile/components/ProfileCollectionPage';
import OwnerRatingBadge from '@/features/profile/components/OwnerRatingBadge';
import { useAuth } from '@/features/auth/contexts/AuthContext';

function compareWatchedAt(a: UserWatchedMovieItem, b: UserWatchedMovieItem): number {
  return a.watchedAt.localeCompare(b.watchedAt);
}

function watchedKey(item: UserWatchedMovieItem): string {
  return `${item.tmdbId}|${item.mediaType}|${item.watchedAt}`;
}

export default function ProfileMoviesPage() {
  const { handle } = useParams<{ handle: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const scale = user?.ratingScale ?? 'five';

  const texts = useMemo<ProfileCollectionTexts>(
    () => ({
      pageTitle: (name) => t('profile.movies.pageTitle', { name }),
      seoDescription: (profile) =>
        t('profile.movies.seoDescription', { name: profile.displayName, handle: profile.handle }),
      subtitle: ({ length: count }) =>
        pluralizeCount(count, 'profile.movies.pageSubtitleOne', 'profile.movies.pageSubtitle', t, {
          count,
        }),
      listAria: t('profile.movies.listAria'),
      loadError: t('profile.movies.loadError'),
      emptyTitle: t('profile.movies.emptyTitle'),
      emptyMessage: t('profile.movies.emptyMessage'),
      searchLabel: t('profile.movies.toolbar.searchLabel'),
      sortPrimaryLabel: t('profile.movies.toolbar.sortWatchedAt'),
    }),
    [t]
  );

  return (
    <ProfileCollectionPage
      handle={handle}
      queryKey={queryKeys.profile.watchedMovies(handle, WATCHED_MOVIES_TAKE)}
      fetchItems={fetchUserWatchedMovieItems}
      comparePrimary={compareWatchedAt}
      itemKey={watchedKey}
      canonicalPath={ROUTES.profileMovies}
      texts={texts}
      renderLeadingBadge={(item, ownerHandle) =>
        item.myRating != null ? (
          <OwnerRatingBadge handle={ownerHandle} value={item.myRating} scale={scale} />
        ) : undefined
      }
    />
  );
}
