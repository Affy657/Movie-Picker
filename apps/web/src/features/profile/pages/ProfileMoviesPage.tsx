import { useMemo } from 'react';
import { useParams } from 'react-router';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import {
  fetchUserWatchedMovies,
  type UserWatchedMovieItem,
} from '@/features/profile/api/profileApi';
import ProfileCollectionPage, {
  type ProfileCollectionTexts,
} from '@/features/profile/components/ProfileCollectionPage';

const MOVIES_TAKE = 200;

async function fetchItems(handle: string, signal: AbortSignal): Promise<UserWatchedMovieItem[]> {
  const res = await fetchUserWatchedMovies(handle, MOVIES_TAKE, signal);
  return res.items;
}

function compareWatchedAt(a: UserWatchedMovieItem, b: UserWatchedMovieItem): number {
  return a.watchedAt.localeCompare(b.watchedAt);
}

function watchedKey(item: UserWatchedMovieItem): string {
  return `${item.tmdbId}|${item.mediaType}|${item.watchedAt}`;
}

export default function ProfileMoviesPage() {
  const { handle } = useParams<{ handle: string }>();
  const { t } = useTranslation();

  const texts = useMemo<ProfileCollectionTexts>(
    () => ({
      pageTitle: (name) => t('profile.movies.pageTitle', { name }),
      seoDescription: (profile) =>
        t('profile.movies.seoDescription', { name: profile.displayName, handle: profile.handle }),
      subtitle: (count) =>
        t(count === 1 ? 'profile.movies.pageSubtitleOne' : 'profile.movies.pageSubtitle', {
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
      queryKey={queryKeys.profile.watchedMovies(handle, MOVIES_TAKE)}
      fetchItems={fetchItems}
      comparePrimary={compareWatchedAt}
      itemKey={watchedKey}
      canonicalPath={ROUTES.profileMovies}
      texts={texts}
    />
  );
}
