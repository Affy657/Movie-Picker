import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import Avatar from '@/shared/components/Avatar';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import SupporterBadge from '@/features/profile/components/SupporterBadge';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import type { AccentColor } from '@/shared/types/theme';
import { isChosenAccent } from '@/shared/utils/accentColor';
import styles from './ProfileHeader.module.css';

type FollowTab = 'following' | 'followers';

interface PublicLists {
  count: number;
  to: string;
}

interface Props {
  profile: PublicProfile;
  memberSince: string;
  lists?: PublicLists | null;
  summary?: ReactNode;
  onOpenFollowModal: (tab: FollowTab) => void;
  accent?: AccentColor;
  overBanner?: boolean;
  children?: ReactNode;
}

export default function ProfileHeader({
  profile,
  memberSince,
  lists,
  summary,
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
          {lists && lists.count > 0 && (
            <Link to={lists.to} className={styles.followCount}>
              <span className={styles.count}>{lists.count}</span>{' '}
              {pluralizeCount(lists.count, 'profile.follow.listOne', 'profile.follow.lists', t)}
            </Link>
          )}
        </div>

        {summary && <div className={styles.summary}>{summary}</div>}
      </div>

      <div className={styles.actions}>{children}</div>
    </section>
  );
}
