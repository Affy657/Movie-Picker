import { Link } from 'react-router';
import { Link2, Pencil, UserCheck, UserPlus } from 'lucide-react';
import { ROUTES, withReturnTo } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import QrCodeButton from '@/shared/components/QrCodeButton';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import styles from './ProfileActions.module.css';

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
          className={`btn ${styles.primary}${profile.isFollowedByMe ? '' : ' btn-primary'}`}
          disabled={followPending}
          onClick={() => (profile.isFollowedByMe ? onUnfollow() : onFollow())}
        >
          {profile.isFollowedByMe ? (
            <UserCheck size={16} aria-hidden />
          ) : (
            <UserPlus size={16} aria-hidden />
          )}
          <span className={styles.btnLabel}>
            {profile.isFollowedByMe ? t('profile.follow.unfollow') : t('profile.follow.follow')}
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
        />
      </div>
    </div>
  );
}
