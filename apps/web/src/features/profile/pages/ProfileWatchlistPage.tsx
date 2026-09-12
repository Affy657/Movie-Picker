import { useMemo } from 'react';
import { useParams } from 'react-router';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { fetchUserWatchlist, type UserWatchlistItem } from '@/features/profile/api/profileApi';
import ProfileCollectionPage, {
  type ProfileCollectionTexts,
} from '@/features/profile/components/ProfileCollectionPage';

const WATCHLIST_TAKE = 500;

function fetchItems(handle: string, signal: AbortSignal): Promise<UserWatchlistItem[]> {
  return fetchUserWatchlist(handle, WATCHLIST_TAKE, signal);
}

function compareAddedAt(a: UserWatchlistItem, b: UserWatchlistItem): number {
  return a.createdAt.localeCompare(b.createdAt);
}

function watchlistItemKey(item: UserWatchlistItem): string {
  return `${item.tmdbId}|${item.mediaType}`;
}

export default function ProfileWatchlistPage() {
  const { handle } = useParams<{ handle: string }>();
  const { t } = useTranslation();

  const texts = useMemo<ProfileCollectionTexts>(
    () => ({
      pageTitle: (name) => t('profile.watchlist.pageTitle', { name }),
      seoDescription: (profile) =>
        t('profile.watchlist.seoDescription', {
          name: profile.displayName,
          handle: profile.handle,
        }),
      subtitle: (count) =>
        pluralizeCount(count, 'profile.watchlist.countOne', 'profile.watchlist.count', t),
      listAria: t('profile.watchlist.listAria'),
      loadError: t('profile.watchlist.loadError'),
      emptyTitle: t('profile.watchlist.emptyTitle'),
      emptyMessage: t('profile.watchlist.emptyMessage'),
      searchLabel: t('profile.watchlist.searchLabel'),
      sortPrimaryLabel: t('profile.watchlist.sortAddedAt'),
    }),
    [t]
  );

  return (
    <ProfileCollectionPage
      handle={handle}
      queryKey={queryKeys.profile.watchlist(handle, WATCHLIST_TAKE)}
      fetchItems={fetchItems}
      comparePrimary={compareAddedAt}
      itemKey={watchlistItemKey}
      canonicalPath={ROUTES.profileWatchlist}
      texts={texts}
    />
  );
}
