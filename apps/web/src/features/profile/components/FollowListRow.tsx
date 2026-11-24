import { UserCheck, UserMinus } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
import Chip from '@/shared/components/Chip';
import { MenuItem, MenuPanel } from '@/shared/components/Menu';
import PersonRow from '@/shared/components/PersonRow';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useMenuState } from '@/shared/hooks/useMenuState';
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

type ActionProps = Readonly<Pick<Props, 'item' | 'pending' | 'onToggleFollow'>>;

function FollowedMenu({ item, pending, onToggleFollow }: ActionProps) {
  const { t } = useTranslation();
  const menu = useMenuState({ align: 'right' });

  return (
    <div ref={menu.containerRef} className={styles.followMenu}>
      <Button
        {...menu.triggerProps}
        variant={menu.open ? 'soft' : 'secondary'}
        size="sm"
        className={styles.followBtn}
        aria-disabled={pending || undefined}
        aria-busy={pending || undefined}
        data-follow-handle={item.handle}
        aria-label={t('profile.follow.followingAriaLabel', { handle: item.handle })}
      >
        <UserCheck size={ICON_SIZE.sm} aria-hidden />
        {t('profile.follow.followingIdle')}
      </Button>
      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={item.displayName}>
          <MenuItem
            tone="danger"
            icon={<UserMinus size={ICON_SIZE.md} aria-hidden />}
            ariaLabel={t('profile.follow.unfollowAriaLabel', { handle: item.handle })}
            onClick={() => {
              menu.close();
              onToggleFollow(item);
            }}
          >
            {t('profile.follow.unfollow')}
          </MenuItem>
        </MenuPanel>
      ) : null}
    </div>
  );
}

function FollowButton({ item, pending, onToggleFollow }: ActionProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="soft"
      size="sm"
      className={styles.followBtn}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      data-follow-handle={item.handle}
      aria-label={t('profile.follow.followAriaLabel', { handle: item.handle })}
      onClick={() => onToggleFollow(item)}
    >
      {t('profile.follow.follow')}
    </Button>
  );
}

function MeBadge() {
  const { t } = useTranslation();

  return (
    <Chip tone="primary" size="sm">
      {t('profile.follow.isMeBadge')}
    </Chip>
  );
}

function rowAction({ item, isMe, canFollow, pending, onToggleFollow }: Readonly<Props>) {
  if (isMe) return <MeBadge />;
  if (!canFollow) return null;
  const Action = item.isFollowedByMe ? FollowedMenu : FollowButton;
  return <Action item={item} pending={pending} onToggleFollow={onToggleFollow} />;
}

export default function FollowListRow(props: Readonly<Props>) {
  const { item, highlight, onNavigate } = props;

  return (
    <PersonRow
      avatar={<Avatar avatarId={item.avatarId} pseudo={item.displayName} size="md" />}
      name={<HighlightedText value={item.displayName} highlight={highlight} />}
      detail={
        <>
          @<HighlightedText value={item.handle} highlight={highlight} />
        </>
      }
      to={ROUTES.profile(item.handle)}
      onNavigate={onNavigate}
      action={rowAction(props)}
    />
  );
}
