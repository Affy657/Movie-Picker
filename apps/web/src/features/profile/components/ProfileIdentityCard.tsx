import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import { useTranslation } from '@/shared/i18n';
import ProfileStreakFlame from '@/features/profile/components/ProfileStreakFlame';
import SupporterBadge from '@/features/profile/components/SupporterBadge';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import styles from './ProfileIdentityCard.module.css';
import Card from '@/shared/components/Card';

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

export default function ProfileIdentityCard({
  profile,
  memberSince,
  streak,
  onOpenFollowModal,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Card padding="none" radius="lg" className={styles.card}>
      <Avatar
        avatarId={profile.avatarId}
        pseudo={profile.displayName}
        size="xl"
        className={styles.avatar}
      />

      <h1 id="profile-heading" className={styles.name}>
        {profile.displayName}
      </h1>

      <div className={styles.handleRow}>
        <p className={styles.handle}>@{profile.handle}</p>
        {profile.isSupporter && <SupporterBadge />}
      </div>

      {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

      {memberSince && (
        <p className={styles.memberSince}>{t('profile.memberSince', { date: memberSince })}</p>
      )}

      {streak && <ProfileStreakFlame weeks={streak.weeks} bestWeeks={streak.bestWeeks} />}

      <div className={styles.followStats}>
        <button
          type="button"
          className={styles.statCell}
          aria-haspopup="dialog"
          onClick={() => onOpenFollowModal('following')}
        >
          <span className={styles.statCellText}>
            <span className={styles.statCellCount}>{profile.followingCount}</span>
            <span className={styles.statCellLabel}>{t('profile.follow.following')}</span>
          </span>
          <ChevronRight size={16} className={styles.chevron} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.statCell}
          aria-haspopup="dialog"
          onClick={() => onOpenFollowModal('followers')}
        >
          <span className={styles.statCellText}>
            <span className={styles.statCellCount}>{profile.followersCount}</span>
            <span className={styles.statCellLabel}>{t('profile.follow.followers')}</span>
          </span>
          <ChevronRight size={16} className={styles.chevron} aria-hidden />
        </button>
      </div>

      <div className={styles.divider} />

      {children}
    </Card>
  );
}
