import { lazy, Suspense, useState } from 'react';
import { useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';
import { getErrorMessage, ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { APP_DOCUMENT_TITLE, pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import ProfileHeader from '@/features/profile/components/ProfileHeader';
import ProfileStatsSection from '@/features/profile/components/ProfileStatsSection';
import ProfileActions from '@/features/profile/components/ProfileActions';
import ProfilePageSkeleton, {
  ProfileStatsSkeleton,
} from '@/features/profile/components/ProfilePageSkeleton';
import {
  ProfileLoadErrorState,
  ProfileNotFoundState,
} from '@/features/profile/components/ProfileQueryStates';
import {
  fetchPublicProfile,
  followUser,
  unfollowUser,
  type PublicProfile,
} from '@/features/profile/api/profileApi';
import { useProfileWatchedPreview } from '@/features/profile/hooks/useProfileWatchedPreview';
import { invalidateFollowGraph } from '@/features/profile/lib/invalidateFollowGraph';
import { fetchUserStats } from '@/features/events/api/userStatsApi';
import styles from './ProfilePage.module.css';
import InlineError from '@/shared/components/InlineError';

const FollowListModal = lazy(() => import('@/features/profile/components/FollowListModal'));
const ProfileMoviesSection = lazy(
  () => import('@/features/profile/components/ProfileMoviesSection')
);
const ProfileActivitySection = lazy(
  () => import('@/features/profile/components/ProfileActivitySection')
);

function formatMemberSince(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

function buildProfileDescription(profile: PublicProfile, t: Translate): string {
  const bio = profile.bio?.trim();
  if (bio) return bio;
  return t('profile.seoDescription', { name: profile.displayName, handle: profile.handle });
}

function buildProfileJsonLd(profile: PublicProfile): Record<string, unknown> {
  const bio = profile.bio?.trim();
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: profile.displayName,
      alternateName: `@${profile.handle}`,
      url: absoluteUrl(ROUTES.profile(profile.handle)),
      ...(bio ? { description: bio } : {}),
    },
  };
}

type FollowTab = 'following' | 'followers';

export default function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const queryClient = useQueryClient();
  const [followModal, setFollowModal] = useState<FollowTab | null>(null);
  const [followError, setFollowError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.public(handle),
    queryFn: () => fetchPublicProfile(handle ?? ''),
    enabled: !!handle,
    retry: false,
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.profile.stats(handle),
    queryFn: ({ signal }) => fetchUserStats(handle ?? '', signal),
    enabled: !!handle,
    retry: false,
  });

  const watchedQuery = useProfileWatchedPreview(handle);

  const profile = profileQuery.data;
  const isOwnProfile = !!user && !!profile && user.handle === profile.handle;
  const isNotFound =
    !handle ||
    (profileQuery.isError && ApiError.is(profileQuery.error) && profileQuery.error.code === 404);

  usePageSeo(
    profile
      ? {
          title: pageTitle(`@${profile.handle}`),
          description: buildProfileDescription(profile, t),
          canonical: absoluteUrl(ROUTES.profile(profile.handle)),
          ogType: 'profile',
          jsonLd: buildProfileJsonLd(profile),
        }
      : { title: APP_DOCUMENT_TITLE, noindex: isNotFound }
  );

  const followMutation = useMutation({
    mutationFn: () => followUser(profile!.handle),
    onSuccess: () => {
      setFollowError(null);
      void invalidateFollowGraph(queryClient);
      track('user_followed');
    },
    onError: (err) => setFollowError(getErrorMessage(err, t('profile.follow.error'))),
  });

  const unfollowMutation = useMutation({
    mutationFn: () => unfollowUser(profile!.handle),
    onSuccess: () => {
      setFollowError(null);
      void invalidateFollowGraph(queryClient);
      track('user_unfollowed');
    },
    onError: (err) => setFollowError(getErrorMessage(err, t('profile.follow.error'))),
  });

  if (profileQuery.isPending && handle) {
    return (
      <PageLayout className={styles.layout}>
        <ProfilePageSkeleton label={t('profile.loading')} />
      </PageLayout>
    );
  }

  if (isNotFound) {
    return <ProfileNotFoundState handle={handle} />;
  }

  if (profileQuery.isError || !profile) {
    return <ProfileLoadErrorState error={profileQuery.error} />;
  }

  const memberSince = formatMemberSince(profile.memberSince, locale);
  const followPending = followMutation.isPending || unfollowMutation.isPending;
  const stats = statsQuery.data;
  const streak =
    stats && stats.currentStreakWeeks > 0
      ? { weeks: stats.currentStreakWeeks, bestWeeks: stats.bestStreakWeeks }
      : null;
  const watchlistCount = profile.watchlistCount ?? 0;
  const watchlist =
    isOwnProfile || profile.watchlistCount != null
      ? { count: watchlistCount, isHidden: isOwnProfile && !profile.isWatchlistPublic }
      : null;

  return (
    <PageLayout className={styles.layout}>
      <ProfileHeader
        profile={profile}
        memberSince={memberSince}
        streak={streak}
        onOpenFollowModal={setFollowModal}
      >
        <ProfileActions
          profile={profile}
          isOwnProfile={isOwnProfile}
          isLoggedIn={!!user}
          followPending={followPending}
          memberSinceLabel={t('profile.memberSince', { date: memberSince })}
          onFollow={() => followMutation.mutate()}
          onUnfollow={() => unfollowMutation.mutate()}
        />
        {followError && (
          <p className="error" role="alert">
            {followError}
          </p>
        )}
      </ProfileHeader>

      <div className={styles.content}>
        {statsQuery.isPending && <ProfileStatsSkeleton />}

        {statsQuery.isError && (
          <InlineError
            message={t('profile.stats.loadError')}
            retryLabel={t('profile.stats.retry')}
            onRetry={() => void statsQuery.refetch()}
          />
        )}

        {stats && (
          <ProfileStatsSection
            stats={stats}
            watchedCount={watchedQuery.data?.total}
            watchedPending={watchedQuery.isPending}
            watchedTo={ROUTES.profileMovies(profile.handle)}
          />
        )}

        <Suspense fallback={null}>
          <ProfileMoviesSection
            handle={profile.handle}
            favorites={profile.favorites ?? []}
            isOwnProfile={isOwnProfile}
            watchlist={watchlist}
          />
        </Suspense>

        {stats && (
          <Suspense fallback={null}>
            <ProfileActivitySection stats={stats} />
          </Suspense>
        )}
      </div>

      {followModal !== null && (
        <Suspense fallback={null}>
          <FollowListModal
            handle={profile.handle}
            initialTab={followModal}
            followingCount={profile.followingCount}
            followersCount={profile.followersCount}
            onClose={() => setFollowModal(null)}
          />
        </Suspense>
      )}
    </PageLayout>
  );
}
