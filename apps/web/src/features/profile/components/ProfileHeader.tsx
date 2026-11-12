import type { ReactNode } from 'react';
import Avatar from '@/shared/components/Avatar';
import { useTranslation } from '@/shared/i18n';
import ProfileStreakFlame from '@/features/profile/components/ProfileStreakFlame';
import SupporterBadge from '@/features/profile/components/SupporterBadge';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import styles from './ProfileHeader.module.css';

type FollowTab = 'following' | 'followers';

interface Streak {
  weeks: number;
  bestWeeks: number;
}

interface Props {
  profile: PublicProfile;
  memberSince: string;
  streak: Streak | null;
  onOpenFollowModal: (tab: FollowTab) => void;
  children?: ReactNode;
}

export default function ProfileHeader({
  profile,
  memberSince,
  streak,
  onOpenFollowModal,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <header className={styles.header} aria-labelledby="profile-heading">
      <Avatar
        avatarId={profile.avatarId}
        pseudo={profile.displayName}
        size="xl"
        className={styles.avatar}
      />

      <div className={styles.identity}>
        <div className={styles.nameRow}>
          <h1 id="profile-heading" className={styles.name}>
            {profile.displayName}
          </h1>
          {profile.isSupporter && <SupporterBadge />}
        </div>

        <p className={styles.meta}>
          <span>@{profile.handle}</span>
          {memberSince && <span>{t('profile.memberSince', { date: memberSince })}</span>}
        </p>

        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

        <div className={styles.social}>
          <button
            type="button"
            className={styles.followCount}
            aria-haspopup="dialog"
            onClick={() => onOpenFollowModal('following')}
          >
            <span className={styles.count}>{profile.followingCount}</span>{' '}
            {t('profile.follow.following')}
          </button>
          <button
            type="button"
            className={styles.followCount}
            aria-haspopup="dialog"
            onClick={() => onOpenFollowModal('followers')}
          >
            <span className={styles.count}>{profile.followersCount}</span>{' '}
            {t('profile.follow.followers')}
          </button>
          {streak && <ProfileStreakFlame weeks={streak.weeks} bestWeeks={streak.bestWeeks} />}
        </div>
      </div>

      <div className={styles.actions}>{children}</div>
    </header>
  );
}
