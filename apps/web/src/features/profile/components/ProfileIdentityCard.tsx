import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import { Bookmark, ChevronRight, Lock } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import Avatar from '@/shared/components/Avatar';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
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
  isOwnProfile: boolean;
  onOpenFollowModal: (tab: FollowTab) => void;
  children?: ReactNode;
}

function WatchlistCell({
  profile,
  isOwnProfile,
}: Readonly<Pick<Props, 'profile' | 'isOwnProfile'>>) {
  const { t } = useTranslation();
  const count = profile.watchlistCount ?? 0;
  if (!isOwnProfile && count === 0) return null;

  const hidden = isOwnProfile && !profile.isWatchlistPublic;
  const Icon = hidden ? Lock : Bookmark;

  return (
    <Link
      to={isOwnProfile ? ROUTES.watchlist : ROUTES.profileWatchlist(profile.handle)}
      className={clsx(styles.statCell, styles.watchlistCell)}
    >
      <Icon
        size={16}
        className={clsx(styles.watchlistIcon, hidden && styles.watchlistIconMuted)}
        aria-hidden
      />
      <span className={styles.watchlistText}>
        <span className={styles.watchlistLabel}>
          {isOwnProfile ? t('profile.watchlist.mine') : t('profile.watchlist.theirs')}
        </span>
        {hidden ? (
          <span className={styles.hiddenPill}>{t('profile.watchlist.hidden')}</span>
        ) : (
          <span className={styles.watchlistCount}>
            {count === 0
              ? t('profile.watchlist.empty')
              : pluralizeCount(count, 'profile.watchlist.countOne', 'profile.watchlist.count', t)}
          </span>
        )}
      </span>
      <ChevronRight size={16} className={styles.chevron} aria-hidden />
    </Link>
  );
}

export default function ProfileIdentityCard({
  profile,
  memberSince,
  streak,
  isOwnProfile,
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

      <WatchlistCell profile={profile} isOwnProfile={isOwnProfile} />

      <div className={styles.divider} />

      {children}
    </Card>
  );
}
