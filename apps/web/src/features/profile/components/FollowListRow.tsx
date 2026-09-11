import { Link } from 'react-router';
import { UserCheck, UserPlus } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import type { FollowUserItem } from '@/features/profile/api/profileApi';
import HighlightedText from './HighlightedText';
import styles from './FollowListModal.module.css';

type Props = {
  item: FollowUserItem;
  isMe: boolean;
  canFollow: boolean;
  pending: boolean;
  highlight: string;
  onToggleFollow: (item: FollowUserItem) => void;
  onNavigate: () => void;
};

export default function FollowListRow({
  item,
  isMe,
  canFollow,
  pending,
  highlight,
  onToggleFollow,
  onNavigate,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const followed = item.isFollowedByMe === true;

  return (
    <li className={styles.item}>
      <Link to={ROUTES.profile(item.handle)} className={styles.itemLink} onClick={onNavigate}>
        <Avatar avatarId={item.avatarId} pseudo={item.displayName} size="md" />
        <div className={styles.itemInfo}>
          <span className={styles.itemName}>
            <HighlightedText value={item.displayName} highlight={highlight} />
          </span>
          <span className={styles.itemHandle}>
            @<HighlightedText value={item.handle} highlight={highlight} />
          </span>
        </div>
      </Link>
      {canFollow && (
        <button
          type="button"
          className={followed ? styles.unfollowBtn : styles.followBtn}
          disabled={pending}
          onClick={() => onToggleFollow(item)}
          aria-label={
            followed
              ? t('profile.follow.unfollowAriaLabel', { handle: item.handle })
              : t('profile.follow.followAriaLabel', { handle: item.handle })
          }
        >
          {followed ? <UserCheck size={16} aria-hidden /> : <UserPlus size={16} aria-hidden />}
          <span className={styles.btnLabel}>
            {followed ? t('profile.follow.unfollow') : t('profile.follow.follow')}
          </span>
        </button>
      )}
      {isMe && <span className={styles.meBadge}>{t('profile.follow.isMeBadge')}</span>}
    </li>
  );
}
