import { useState } from 'react';
import { Link } from 'react-router';
import { Pencil, Share2, UserCheck, UserMinus, UserPlus } from 'lucide-react';
import { ROUTES, withReturnTo } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import ShareDialog from '@/shared/components/ShareDialog';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import styles from './ProfileActions.module.css';
import Button, { buttonClass } from '@/shared/components/Button';
import clsx from 'clsx';

function followButtonClass(
  isFollowedByMe: boolean | null,
  primary: string | undefined,
  unfollowBtn: string | undefined
): string {
  return clsx(primary, isFollowedByMe && unfollowBtn);
}

function FollowButtonIcon({
  followPending,
  isFollowedByMe,
  spinnerClass,
  iconIdle,
  iconActive,
}: Readonly<{
  followPending: boolean;
  isFollowedByMe: boolean | null;
  spinnerClass: string | undefined;
  iconIdle: string | undefined;
  iconActive: string | undefined;
}>) {
  if (followPending) return <span className={spinnerClass} aria-hidden />;
  if (isFollowedByMe) {
    return (
      <>
        <UserCheck size={16} aria-hidden className={iconIdle} />
        <UserMinus size={16} aria-hidden className={iconActive} />
      </>
    );
  }
  return <UserPlus size={16} aria-hidden />;
}

interface Props {
  profile: PublicProfile;
  isOwnProfile: boolean;
  isLoggedIn: boolean;
  followPending: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  memberSinceLabel: string;
}

export default function ProfileActions({
  profile,
  isOwnProfile,
  isLoggedIn,
  followPending,
  onFollow,
  onUnfollow,
  memberSinceLabel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [shareOpen, setShareOpen] = useState(false);
  const shareUrl = absoluteUrl(ROUTES.profile(profile.handle));

  return (
    <div className={styles.actions}>
      {isOwnProfile && (
        <Link to={ROUTES.account} className={buttonClass({ className: styles.primary })}>
          <Pencil size={16} aria-hidden />
          <span className={styles.btnLabel}>{t('profile.editProfile')}</span>
        </Link>
      )}

      {!isOwnProfile && !isLoggedIn && (
        <Link
          to={withReturnTo(ROUTES.login, ROUTES.profile(profile.handle))}
          className={buttonClass({ variant: 'primary', className: styles.primary })}
        >
          <UserPlus size={16} aria-hidden />
          <span className={styles.btnLabel}>{t('profile.follow.follow')}</span>
        </Link>
      )}

      {!isOwnProfile && isLoggedIn && (
        <Button
          type="button"
          variant={profile.isFollowedByMe ? 'secondary' : 'primary'}
          className={followButtonClass(profile.isFollowedByMe, styles.primary, styles.unfollowBtn)}
          disabled={followPending}
          aria-label={
            profile.isFollowedByMe
              ? t('profile.follow.unfollowAriaLabel', { handle: profile.handle })
              : t('profile.follow.followAriaLabel', { handle: profile.handle })
          }
          onClick={() => (profile.isFollowedByMe ? onUnfollow() : onFollow())}
        >
          <FollowButtonIcon
            followPending={followPending}
            isFollowedByMe={profile.isFollowedByMe}
            spinnerClass={styles.spinner}
            iconIdle={styles.iconIdle}
            iconActive={styles.iconActive}
          />
          <span className={styles.btnLabel}>
            {profile.isFollowedByMe ? (
              <>
                <span className={styles.labelIdle}>{t('profile.follow.followingIdle')}</span>
                <span className={styles.labelActive}>{t('profile.follow.unfollow')}</span>
              </>
            ) : (
              t('profile.follow.follow')
            )}
          </span>
        </Button>
      )}

      <div className={styles.shareGroup}>
        <Button type="button" className={styles.shareBtn} onClick={() => setShareOpen(true)}>
          <Share2 size={14} aria-hidden />
          <span className={styles.btnLabel}>{t('share.trigger')}</span>
        </Button>
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={t('profile.shareTitle')}
        url={shareUrl}
        qrHint={t('profile.qrHint')}
        fileSlug={profile.handle}
        preview={{
          avatarId: profile.avatarId,
          name: profile.displayName,
          meta: [`@${profile.handle}`, memberSinceLabel],
        }}
        surface="profile"
      />
    </div>
  );
}
