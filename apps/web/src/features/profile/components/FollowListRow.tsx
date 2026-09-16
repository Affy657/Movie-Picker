import { Link } from 'react-router';
import { UserCheck, UserPlus } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
import Chip from '@/shared/components/Chip';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import type { FollowUserItem } from '@/features/profile/api/profileApi';
import HighlightedText from './HighlightedText';
import styles from './FollowListModal.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

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
        <Button
          size="sm"
          variant={followed ? 'secondary' : 'primary'}
          className={styles.followBtn}
          disabled={pending}
          onClick={() => onToggleFollow(item)}
          aria-label={
            followed
              ? t('profile.follow.unfollowAriaLabel', { handle: item.handle })
              : t('profile.follow.followAriaLabel', { handle: item.handle })
          }
        >
          {followed ? (
            <UserCheck size={ICON_SIZE.md} aria-hidden />
          ) : (
            <UserPlus size={ICON_SIZE.md} aria-hidden />
          )}
          <span className={styles.btnLabel}>
            {followed ? t('profile.follow.unfollow') : t('profile.follow.follow')}
          </span>
        </Button>
      )}
      {isMe && (
        <Chip tone="primary" size="sm" className={styles.meBadge}>
          {t('profile.follow.isMeBadge')}
        </Chip>
      )}
    </li>
  );
}
