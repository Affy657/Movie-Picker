import type { ReactNode } from 'react';
import clsx from 'clsx';
import Avatar from '@/shared/components/Avatar';
import { useTranslation } from '@/shared/i18n';
import ProfileStreakFlame from '@/features/profile/components/ProfileStreakFlame';
import SupporterBadge from '@/features/profile/components/SupporterBadge';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import type { AccentColor } from '@/shared/types/theme';
import { isChosenAccent } from '@/shared/utils/accentColor';
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
  accent?: AccentColor;
  overBanner?: boolean;
  children?: ReactNode;
}

export default function ProfileHeader({
  profile,
  memberSince,
  streak,
  onOpenFollowModal,
  accent,
  overBanner = false,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <section className={styles.header} aria-labelledby="profile-heading">
      <Avatar
        avatarId={profile.avatarId}
        pseudo={profile.displayName}
        size="xl"
        accent={accent}
        className={clsx(
          styles.avatar,
          overBanner && styles.avatarOverBanner,
          isChosenAccent(accent) && styles.avatarAccent
        )}
        priority
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
    </section>
  );
}
