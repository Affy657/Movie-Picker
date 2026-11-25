import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import clsx from 'clsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Film } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';
import { getErrorMessage, ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { missingProfileSeo } from '@/features/profile/utils/profileCollectionSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import ProfileHeader from '@/features/profile/components/ProfileHeader';
import ProfileStatsSection, {
  PROFILE_STATS_ID,
} from '@/features/profile/components/ProfileStatsSection';
import ProfileStatsSummary from '@/features/profile/components/ProfileStatsSummary';
import ProfileActions, { ProfileTools } from '@/features/profile/components/ProfileActions';
import ProfileBanner from '@/features/profile/components/ProfileBanner';
import ProfilePageSkeleton, {
  ProfileStatsSkeleton,
} from '@/features/profile/components/ProfilePageSkeleton';
import {
  ProfileLoadErrorState,
  ProfileNotFoundState,
} from '@/features/profile/components/ProfileQueryStates';
import { followUser, unfollowUser, type PublicProfile } from '@/features/profile/api/profileApi';
import { useProfileMoviesSection } from '@/features/profile/hooks/useProfileMoviesSection';
import { useProfileWatchedPreview } from '@/features/profile/hooks/useProfileWatchedPreview';
import { usePublicProfile } from '@/features/profile/hooks/usePublicProfile';
import { invalidateFollowGraph } from '@/features/profile/lib/invalidateFollowGraph';
import { fetchUserStats } from '@/features/events/api/userStatsApi';
import styles from './ProfilePage.module.css';
import InlineError from '@/shared/components/InlineError';
import EmptyState from '@/shared/components/EmptyState';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { UserStats } from '@/features/events/api/userStatsApi';
import { accentZoneClass, isChosenAccent } from '@/shared/utils/accentColor';
import { withElision } from '@/shared/i18n/withElision';

const FollowListModal = lazy(() => import('@/features/profile/components/FollowListModal'));
const BannerPicker = lazy(() => import('@/features/profile/components/BannerPicker'));

function formatMemberSince(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

function buildProfileDescription(profile: PublicProfile, t: Translate): string {
  const bio = profile.bio?.trim();
  if (bio) return bio;
  return withElision(
    profile.displayName,
    'profile.seoDescription',
    'profile.seoDescriptionElided',
    t,
    { handle: profile.handle }
  );
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

function profileSeo(profile: PublicProfile, showsNothing: boolean, t: Translate) {
  return {
    title: pageTitle(`@${profile.handle}`),
    description: buildProfileDescription(profile, t),
    canonical: absoluteUrl(ROUTES.profile(profile.handle)),
    ogType: 'profile' as const,
    jsonLd: buildProfileJsonLd(profile),
    noindex: showsNothing && !profile.bio?.trim(),
  };
}

type FollowTab = 'following' | 'followers';

interface VisitorView {
  isOwnProfile: boolean;
  stats: UserStats | undefined;
  watchedHidden: boolean;
  watchedCount: number | undefined;
}

function hasNothingToShow(profile: PublicProfile, view: VisitorView): boolean {
  const { stats } = view;
  if (view.isOwnProfile || !stats) return false;
  if (!view.watchedHidden && view.watchedCount !== 0) return false;
  return (
    stats.eventsCreated + stats.eventsJoined + stats.moviesProposed + stats.publicListCount === 0 &&
    (profile.favorites ?? []).length === 0 &&
    !profile.watchlistCount
  );
}

function awaitsFirstAnswer(query: {
  isPending: boolean;
  failureCount: number;
  fetchStatus: string;
}): boolean {
  return query.isPending && query.failureCount === 0 && query.fetchStatus === 'fetching';
}

const SECTIONS_WAIT_MS = 1500;

function useHoldForSections(
  handle: string | undefined,
  profileLoaded: boolean,
  sectionsPending: boolean
): boolean {
  const [waitOverFor, setWaitOverFor] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!profileLoaded) return;
    const timer = setTimeout(() => setWaitOverFor(handle), SECTIONS_WAIT_MS);
    return () => clearTimeout(timer);
  }, [handle, profileLoaded]);
  return profileLoaded && sectionsPending && waitOverFor !== handle;
}

function useProfileBanner(profile: PublicProfile | undefined, isOwnProfile: boolean) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const banner = profile?.banner ?? null;
  const open = () => setPickerOpen(true);
  return {
    banner,
    open,
    layoutClass: banner ? styles.layoutWithBanner : undefined,
    frameClass: banner ? styles.overBanner : undefined,
    onAdd: isOwnProfile && !banner ? open : undefined,
    picker:
      pickerOpen && isOwnProfile ? (
        <Suspense fallback={null}>
          <BannerPicker onClose={() => setPickerOpen(false)} />
        </Suspense>
      ) : null,
  };
}

export default function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const queryClient = useQueryClient();
  const [followModal, setFollowModal] = useState<FollowTab | null>(null);
  const [followError, setFollowError] = useState<string | null>(null);

  const profileQuery = usePublicProfile(handle);

  const statsQuery = useQuery({
    queryKey: queryKeys.profile.stats(handle),
    queryFn: ({ signal }) => fetchUserStats(handle ?? '', signal),
    enabled: !!handle,
    retry: false,
  });

  const profile = profileQuery.data;
  const isOwnProfile = !!user && !!profile && user.handle === profile.handle;
  const bannerView = useProfileBanner(profile, isOwnProfile);
  const watchedHiddenFromVisitor = !!profile && !isOwnProfile && profile.isWatchedPublic === false;
  const watchedVisible = !!profile && !watchedHiddenFromVisitor;
  const watchedPreview = useProfileWatchedPreview(handle, !watchedHiddenFromVisitor);
  const MoviesSection = useProfileMoviesSection(!!profile);
  const holdsForSections = useHoldForSections(
    handle,
    !!profile,
    !MoviesSection || awaitsFirstAnswer(statsQuery) || awaitsFirstAnswer(watchedPreview)
  );
  const isNotFound =
    !handle ||
    (profileQuery.isError && ApiError.is(profileQuery.error) && profileQuery.error.code === 404);
  const visitorView: VisitorView = {
    isOwnProfile,
    stats: statsQuery.data,
    watchedHidden: watchedHiddenFromVisitor,
    watchedCount: watchedPreview.data?.items.length,
  };
  const showEmptyState = !!profile && hasNothingToShow(profile, visitorView);

  usePageSeo(profile ? profileSeo(profile, showEmptyState, t) : missingProfileSeo(isNotFound, t));

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

  if (handle && (profileQuery.isPending || holdsForSections)) {
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
  const publicLists = stats?.publicListCount
    ? { count: stats.publicListCount, to: ROUTES.profileLists(profile.handle) }
    : null;
  const watchlistCount = profile.watchlistCount ?? 0;
  const watchlist =
    isOwnProfile || profile.watchlistCount != null
      ? { count: watchlistCount, isHidden: isOwnProfile && !profile.isWatchlistPublic }
      : null;

  const profileAccent = (isOwnProfile ? user?.accentColor : profile.accentColor) ?? 'default';

  return (
    <PageLayout
      className={clsx(styles.layout, bannerView.layoutClass, accentZoneClass(profileAccent))}
    >
      {bannerView.banner && (
        <ProfileBanner
          banner={bannerView.banner}
          isOwner={isOwnProfile}
          onEdit={bannerView.open}
          tinted={isChosenAccent(profileAccent)}
        />
      )}
      <div className={bannerView.frameClass}>
        <ProfileHeader
          profile={profile}
          memberSince={memberSince}
          lists={publicLists}
          summary={
            stats && (
              <ProfileStatsSummary
                nights={stats.eventsCreated + stats.eventsJoined}
                winning={watchedHiddenFromVisitor ? null : stats.winningProposals}
                streakWeeks={stats.currentStreakWeeks}
                bestStreakWeeks={stats.bestStreakWeeks}
                targetId={PROFILE_STATS_ID}
              />
            )
          }
          accent={profileAccent}
          overBanner={bannerView.banner !== null}
          onOpenFollowModal={setFollowModal}
          tools={<ProfileTools profile={profile} isOwnProfile={isOwnProfile} isLoggedIn={!!user} />}
        >
          <ProfileActions
            profile={profile}
            isOwnProfile={isOwnProfile}
            isLoggedIn={!!user}
            followPending={followPending}
            onFollow={() => followMutation.mutate()}
            onUnfollow={() => unfollowMutation.mutate()}
            onAddBanner={bannerView.onAdd}
          />
          {followError && (
            <p className="error" role="alert">
              {followError}
            </p>
          )}
        </ProfileHeader>

        <div className={styles.content}>
          {MoviesSection && (
            <MoviesSection
              handle={profile.handle}
              favorites={profile.favorites ?? []}
              isOwnProfile={isOwnProfile}
              watchedVisible={watchedVisible}
              watchedHidden={isOwnProfile && profile.isWatchedPublic === false}
              watchlist={watchlist}
            />
          )}

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
              memberSince={memberSince}
              proposalsTo={ROUTES.profileProposals(profile.handle)}
              winningProposalsTo={ROUTES.profileWinningProposals(profile.handle)}
              winningProposalsHidden={watchedHiddenFromVisitor}
              ratingScale={user?.ratingScale}
              isOwnProfile={isOwnProfile}
            />
          )}

          {showEmptyState && (
            <EmptyState
              icon={<Film size={ICON_SIZE.xl} />}
              title={t('profile.empty.title')}
              message={t('profile.empty.message', { name: profile.displayName })}
            />
          )}
        </div>
      </div>

      {bannerView.picker}

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
