import { useMemo } from 'react';
import { useParams } from 'react-router';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { watchlistItemKey } from '@/features/movies/utils/watchlistItemKey';
import {
  fetchUserProposedMovieItems,
  type UserProposedMovieItem,
} from '@/features/profile/api/profileApi';
import ProfileCollectionPage, {
  type ProfileCollectionTexts,
} from '@/features/profile/components/ProfileCollectionPage';
import { ProfileCardBadge } from '@/features/profile/components/OwnerRatingBadge';

type ProposalsNamespace = 'proposals' | 'winningProposals';

function compareLastProposedAt(a: UserProposedMovieItem, b: UserProposedMovieItem): number {
  return a.lastProposedAt.localeCompare(b.lastProposedAt);
}

function proposalKey(item: UserProposedMovieItem): string {
  return watchlistItemKey(item.tmdbId, item.mediaType);
}

function proposalsTexts(
  t: Translate,
  ns: ProposalsNamespace
): ProfileCollectionTexts<UserProposedMovieItem> {
  return {
    pageTitle: (name) => t(`profile.${ns}.pageTitle` as const, { name }),
    seoDescription: (profile) =>
      t(`profile.${ns}.seoDescription` as const, {
        name: profile.displayName,
        handle: profile.handle,
      }),
    subtitle: (items) => {
      const count = items.length;
      const proposals = items.reduce((sum, item) => sum + item.proposalCount, 0);
      return proposals > count
        ? pluralizeCount(
            count,
            `profile.${ns}.pageSubtitleRepeatedOne` as const,
            `profile.${ns}.pageSubtitleRepeated` as const,
            t,
            { count, proposals }
          )
        : pluralizeCount(
            count,
            `profile.${ns}.pageSubtitleOne` as const,
            `profile.${ns}.pageSubtitle` as const,
            t,
            { count }
          );
    },
    listAria: t(`profile.${ns}.listAria` as const),
    loadError: t(`profile.${ns}.loadError` as const),
    emptyTitle: t(`profile.${ns}.emptyTitle` as const),
    emptyMessage: t(`profile.${ns}.emptyMessage` as const),
    searchLabel: t(`profile.${ns}.searchLabel` as const),
    sortPrimaryLabel: t('profile.proposals.sortProposedAt'),
  };
}

export default function ProfileProposalsPage({
  winningOnly = false,
}: Readonly<{ winningOnly?: boolean }>) {
  const { handle } = useParams<{ handle: string }>();
  const { t } = useTranslation();
  const ns: ProposalsNamespace = winningOnly ? 'winningProposals' : 'proposals';

  const texts = useMemo(() => proposalsTexts(t, ns), [t, ns]);

  return (
    <ProfileCollectionPage
      handle={handle}
      queryKey={queryKeys.profile.proposedMovies(handle, winningOnly)}
      fetchItems={(ownerHandle, signal) =>
        fetchUserProposedMovieItems(ownerHandle, winningOnly, signal)
      }
      comparePrimary={compareLastProposedAt}
      itemKey={proposalKey}
      canonicalPath={winningOnly ? ROUTES.profileWinningProposals : ROUTES.profileProposals}
      texts={texts}
      renderLeadingBadge={(item, ownerHandle) =>
        item.proposalCount > 1 ? (
          <ProfileCardBadge
            description={t(`profile.${ns}.timesDescription` as const, {
              handle: ownerHandle,
              count: item.proposalCount,
            })}
          >
            {t('profile.proposals.timesBadge', { count: item.proposalCount })}
          </ProfileCardBadge>
        ) : undefined
      }
    />
  );
}
