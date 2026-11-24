import { Suspense, lazy, useState } from 'react';
import { Link } from 'react-router';
import { ImagePlus, Pencil, Share2, UserCheck, UserMinus, UserPlus } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import AccountPromptLink from '@/shared/components/AccountPromptLink';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import { useEverOpened } from '@/shared/hooks/useEverOpened';
import styles from './ProfileActions.module.css';
import Button, { buttonClass } from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import clsx from 'clsx';
import { ICON_SIZE } from '@/shared/components/iconSize';

const ProfileShareDialog = lazy(() => import('./ProfileShareDialog'));

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
  iconIdle,
  iconActive,
}: Readonly<{
  followPending: boolean;
  isFollowedByMe: boolean | null;
  iconIdle: string | undefined;
  iconActive: string | undefined;
}>) {
  if (followPending) return null;
  if (isFollowedByMe) {
    return (
      <>
        <UserCheck size={ICON_SIZE.md} aria-hidden className={iconIdle} />
        <UserMinus size={ICON_SIZE.md} aria-hidden className={iconActive} />
      </>
    );
  }
  return <UserPlus size={ICON_SIZE.md} aria-hidden />;
}

interface Props {
  profile: PublicProfile;
  isOwnProfile: boolean;
  isLoggedIn: boolean;
  followPending: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  onAddBanner?: () => void;
}

export default function ProfileActions({
  profile,
  isOwnProfile,
  isLoggedIn,
  followPending,
  onFollow,
  onUnfollow,
  onAddBanner,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [shareOpen, setShareOpen] = useState(false);
  const shareMounted = useEverOpened(shareOpen);

  return (
    <div className={styles.actions}>
      {onAddBanner && (
        <Button
          variant="ghost"
          className={styles.addBanner}
          aria-label={t('profile.banner.add')}
          onClick={onAddBanner}
        >
          <ImagePlus size={ICON_SIZE.md} aria-hidden />
          <span className={styles.addBannerLabel}>{t('profile.banner.add')}</span>
        </Button>
      )}
      {isOwnProfile && (
        <Link to={ROUTES.accountProfile} className={buttonClass({ className: styles.primary })}>
          <Pencil size={ICON_SIZE.md} aria-hidden />
          <span className={styles.btnLabel}>{t('profile.editProfile')}</span>
        </Link>
      )}

      {!isOwnProfile && !isLoggedIn && (
        <AccountPromptLink
          returnTo={ROUTES.profile(profile.handle)}
          title={t('profile.follow.visitorTitle', { name: profile.displayName })}
          message={t('profile.follow.visitorMessage', { name: profile.displayName })}
          className={buttonClass({ variant: 'primary', className: styles.primary })}
        >
          <UserPlus size={ICON_SIZE.md} aria-hidden />
          <span className={styles.btnLabel}>{t('profile.follow.follow')}</span>
        </AccountPromptLink>
      )}

      {!isOwnProfile && isLoggedIn && (
        <Button
          type="button"
          variant={profile.isFollowedByMe ? 'secondary' : 'primary'}
          className={followButtonClass(profile.isFollowedByMe, styles.primary, styles.unfollowBtn)}
          loading={followPending}
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

      <IconButton
        size="lg"
        ariaLabel={t('share.trigger')}
        aria-haspopup="dialog"
        onClick={() => setShareOpen(true)}
      >
        <Share2 size={ICON_SIZE.md} aria-hidden />
      </IconButton>

      {shareMounted ? (
        <Suspense fallback={null}>
          <ProfileShareDialog
            profile={profile}
            open={shareOpen}
            onClose={() => setShareOpen(false)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
