import { Link } from 'react-router';
import { Link2, Pencil, UserCheck, UserMinus, UserPlus } from 'lucide-react';
import { ROUTES, withReturnTo } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import QrCodeButton from '@/shared/components/QrCodeButton';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import styles from './ProfileActions.module.css';

function followButtonClass(
  isFollowedByMe: boolean | null,
  primary: string | undefined,
  unfollowBtn: string | undefined
): string {
  if (isFollowedByMe) return `btn ${primary ?? ''} ${unfollowBtn ?? ''}`.trim();
  return `btn ${primary ?? ''} btn-primary`.trim();
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
  copied: boolean;
  onCopyLink: () => void;
}

export default function ProfileActions({
  profile,
  isOwnProfile,
  isLoggedIn,
  followPending,
  onFollow,
  onUnfollow,
  copied,
  onCopyLink,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className={styles.actions}>
      {isOwnProfile && (
        <Link to={ROUTES.account} className={`btn ${styles.primary}`}>
          <Pencil size={16} aria-hidden />
          <span className={styles.btnLabel}>{t('profile.editProfile')}</span>
        </Link>
      )}

      {!isOwnProfile && !isLoggedIn && (
        <Link
          to={withReturnTo(ROUTES.login, ROUTES.profile(profile.handle))}
          className={`btn btn-primary ${styles.primary}`}
        >
          <UserPlus size={16} aria-hidden />
          <span className={styles.btnLabel}>{t('profile.follow.follow')}</span>
        </Link>
      )}

      {!isOwnProfile && isLoggedIn && (
        <button
          type="button"
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
        </button>
      )}

      <div className={styles.shareGroup}>
        <button type="button" className={`btn ${styles.shareBtn}`} onClick={onCopyLink}>
          <Link2 size={14} aria-hidden />
          <span className={styles.btnLabel}>
            {copied ? t('profile.linkCopied') : t('profile.copyLink')}
          </span>
        </button>

        <QrCodeButton
          url={globalThis.location.href}
          dialogTitle={t('profile.qrTitle')}
          hint={t('profile.qrHint')}
          showLabel={t('profile.showQr')}
          closeLabel={t('profile.closeQr')}
          className={`btn ${styles.qrBtn}`}
          avatarId={profile.avatarId}
          displayName={profile.displayName}
          handle={profile.handle}
          copyLabel={t('profile.qrCopyLabel')}
          copiedLabel={t('profile.linkCopied')}
          downloadLabel={t('profile.qrDownload')}
        />
      </div>

      <span className="visually-hidden" role="status" aria-live="polite">
        {copied ? t('profile.linkCopied') : ''}
      </span>
    </div>
  );
}
