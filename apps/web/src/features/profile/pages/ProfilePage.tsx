import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Link2, UserPlus, UserCheck } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import Avatar from '@/shared/components/Avatar';
import { ROUTES } from '@/app/routes';
import { ApiError, getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { APP_DOCUMENT_TITLE, pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useLocale, useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import QrCodeButton from '@/shared/components/QrCodeButton';
import ProfileStreakFlame from '@/features/profile/components/ProfileStreakFlame';
import SupporterBadge from '@/features/profile/components/SupporterBadge';
import {
  fetchPublicProfile,
  fetchUserStats,
  followUser,
  unfollowUser,
  type PublicProfile,
} from '@/features/profile/api/profileApi';
import styles from './ProfilePage.module.css';

const FollowListModal = lazy(() => import('@/features/profile/components/FollowListModal'));
const ProfileStatsSection = lazy(() => import('@/features/profile/components/ProfileStatsSection'));

const COPY_FEEDBACK_MS = 2000;

function formatMemberSince(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

function buildProfileDescription(profile: PublicProfile): string {
  const bio = profile.bio?.trim();
  if (bio) return bio;
  return `Profil de ${profile.displayName} (@${profile.handle}) sur Movie Picker : statistiques de soirées ciné, films proposés et abonnements.`;
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
  const [copied, setCopied] = useState(false);
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

  const profile = profileQuery.data;
  const isOwnProfile = !!user && !!profile && user.handle === profile.handle;
  const isNotFound =
    !handle ||
    (profileQuery.isError && ApiError.is(profileQuery.error) && profileQuery.error.code === 404);

  usePageSeo(
    profile
      ? {
          title: pageTitle(`@${profile.handle}`),
          description: buildProfileDescription(profile),
          canonical: absoluteUrl(ROUTES.profile(profile.handle)),
          ogType: 'profile',
          jsonLd: buildProfileJsonLd(profile),
        }
      : { title: APP_DOCUMENT_TITLE, noindex: isNotFound }
  );

  useEffect(() => {
    if (!copied) return;
    const id = globalThis.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    return () => globalThis.clearTimeout(id);
  }, [copied]);

  const handleCopyLink = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(globalThis.location.href).then(() => setCopied(true));
  }, []);

  const followMutation = useMutation({
    mutationFn: () => followUser(profile!.handle),
    onSuccess: () => {
      setFollowError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.public(handle) });
      track('user_followed');
    },
    onError: (err) => setFollowError(getErrorMessage(err, t('profile.follow.error'))),
  });

  const unfollowMutation = useMutation({
    mutationFn: () => unfollowUser(profile!.handle),
    onSuccess: () => {
      setFollowError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.public(handle) });
      track('user_unfollowed');
    },
    onError: (err) => setFollowError(getErrorMessage(err, t('profile.follow.error'))),
  });

  if (profileQuery.isPending && handle) {
    return (
      <PageLayout className="page--centered">
        <p className="placeholder" aria-busy="true">
          {t('common.loading')}
        </p>
      </PageLayout>
    );
  }

  if (isNotFound) {
    return (
      <PageLayout className="page--centered page--errorState">
        <span className="errorStateIcon" aria-hidden>
          <AlertCircle size={32} />
        </span>
        <p className="errorStateMessage" role="alert">
          {t('profile.notFound')}
        </p>
        <Link to={ROUTES.home} className="btn">
          {t('profile.backHome')}
        </Link>
      </PageLayout>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <PageLayout className="page--centered page--errorState">
        <span className="errorStateIcon" aria-hidden>
          <AlertCircle size={32} />
        </span>
        <p className="errorStateMessage" role="alert">
          {ApiError.is(profileQuery.error) ? profileQuery.error.message : t('profile.loadError')}
        </p>
      </PageLayout>
    );
  }

  const memberSince = formatMemberSince(profile.memberSince, locale);
  const followPending = followMutation.isPending || unfollowMutation.isPending;
  const stats = statsQuery.data;
  const hasStreakHistory = !!stats && (stats.currentStreakWeeks > 0 || stats.bestStreakWeeks > 0);

  return (
    <PageLayout className={styles.layout}>
      <section className={styles.card} aria-labelledby="profile-heading">
        <Avatar
          avatarId={profile.avatarId}
          pseudo={profile.displayName}
          size="lg"
          className={styles.avatar}
        />
        <h1 id="profile-heading" className={styles.displayName}>
          {profile.displayName}
        </h1>
        <p className={styles.handle}>@{profile.handle}</p>

        {profile.isSupporter && <SupporterBadge />}

        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

        {memberSince && (
          <p className={styles.memberSince}>{t('profile.memberSince', { date: memberSince })}</p>
        )}

        {hasStreakHistory && <ProfileStreakFlame weeks={stats.currentStreakWeeks} />}

        <div className={styles.followStats}>
          <button
            type="button"
            className={styles.statBtn}
            onClick={() => setFollowModal('following')}
          >
            <span className={styles.statCount}>{profile.followingCount}</span>
            <span className={styles.statLabel}>{t('profile.follow.following')}</span>
          </button>
          <button
            type="button"
            className={styles.statBtn}
            onClick={() => setFollowModal('followers')}
          >
            <span className={styles.statCount}>{profile.followersCount}</span>
            <span className={styles.statLabel}>{t('profile.follow.followers')}</span>
          </button>
        </div>

        <div className={styles.actions}>
          <div className={styles.shareGroup}>
            <button type="button" className="btn btn-sm" onClick={handleCopyLink}>
              <Link2 size={14} aria-hidden />
              {copied ? t('profile.linkCopied') : t('profile.copyLink')}
            </button>

            <QrCodeButton
              url={globalThis.location.href}
              dialogTitle={t('profile.qrTitle')}
              hint={t('profile.qrHint')}
              showLabel={t('profile.showQr')}
              closeLabel={t('profile.closeQr')}
              className="btn btn-sm"
            />
          </div>

          {user && !isOwnProfile && (
            <button
              type="button"
              className={profile.isFollowedByMe ? 'btn btn-sm' : 'btn btn-sm btn-primary'}
              disabled={followPending}
              onClick={() =>
                profile.isFollowedByMe ? unfollowMutation.mutate() : followMutation.mutate()
              }
            >
              {profile.isFollowedByMe ? (
                <UserCheck size={14} aria-hidden />
              ) : (
                <UserPlus size={14} aria-hidden />
              )}
              {profile.isFollowedByMe ? t('profile.follow.unfollow') : t('profile.follow.follow')}
            </button>
          )}
        </div>

        {followError && (
          <p className="error" role="alert">
            {followError}
          </p>
        )}
      </section>

      {statsQuery.data && (
        <Suspense fallback={null}>
          <ProfileStatsSection stats={statsQuery.data} />
        </Suspense>
      )}

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
