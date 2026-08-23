import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, UserPlus, UserCheck, Users } from 'lucide-react';
import { Link } from 'react-router';
import Avatar from '@/shared/components/Avatar';
import EmptyState from '@/shared/components/EmptyState';
import Sheet from '@/shared/components/Sheet';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { getErrorMessage } from '@/shared/api/apiError';
import {
  fetchFollowing,
  fetchFollowers,
  followUser,
  unfollowUser,
  type FollowUserItem,
} from '@/features/profile/api/profileApi';
import styles from './FollowListModal.module.css';

type Tab = 'following' | 'followers';

interface Props {
  handle: string;
  initialTab: Tab;
  followingCount: number;
  followersCount: number;
  onClose: () => void;
}

export default function FollowListModal({
  handle,
  initialTab,
  followingCount,
  followersCount,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [followError, setFollowError] = useState<string | null>(null);
  const dialogRef = useModalDialog(true, onClose);

  const followingQuery = useQuery({
    queryKey: queryKeys.profile.following(handle),
    queryFn: () => fetchFollowing(handle),
    enabled: tab === 'following',
  });

  const followersQuery = useQuery({
    queryKey: queryKeys.profile.followers(handle),
    queryFn: () => fetchFollowers(handle),
    enabled: tab === 'followers',
  });

  const invalidateProfileQueries = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.following(handle) });
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.followers(handle) });
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.public(handle) });
  };

  const followMutation = useMutation({
    mutationFn: (h: string) => followUser(h),
    onSuccess: () => {
      setFollowError(null);
      invalidateProfileQueries();
    },
    onError: (err) => setFollowError(getErrorMessage(err, t('profile.follow.error'))),
  });

  const unfollowMutation = useMutation({
    mutationFn: (h: string) => unfollowUser(h),
    onSuccess: () => {
      setFollowError(null);
      invalidateProfileQueries();
    },
    onError: (err) => setFollowError(getErrorMessage(err, t('profile.follow.error'))),
  });

  const activeQuery = tab === 'following' ? followingQuery : followersQuery;
  const items = activeQuery.data?.items ?? [];

  const handleToggleFollow = (item: FollowUserItem) => {
    if (item.isFollowedByMe) {
      unfollowMutation.mutate(item.handle);
    } else {
      followMutation.mutate(item.handle);
    }
  };

  const tabs = (
    <div className={styles.tabs}>
      <button
        type="button"
        className={tab === 'following' ? styles.tabActive : styles.tab}
        onClick={() => setTab('following')}
      >
        {t('profile.follow.followingCount', { count: String(followingCount) })}
      </button>
      <button
        type="button"
        className={tab === 'followers' ? styles.tabActive : styles.tab}
        onClick={() => setTab('followers')}
      >
        {t('profile.follow.followersCount', { count: String(followersCount) })}
      </button>
    </div>
  );

  const list = (
    <ul className={styles.list}>
      {activeQuery.isPending && <li className={styles.placeholder}>{t('common.loading')}</li>}
      {!activeQuery.isPending && items.length === 0 && (
        <li>
          <EmptyState
            compact
            icon={<Users size={22} aria-hidden />}
            message={t('profile.follow.empty')}
          />
        </li>
      )}
      {items.map((item) => {
        const isMe = user?.handle === item.handle;
        const pending = followMutation.isPending || unfollowMutation.isPending;
        return (
          <li key={item.handle} className={styles.item}>
            <Link to={ROUTES.profile(item.handle)} className={styles.itemLink} onClick={onClose}>
              <Avatar avatarId={item.avatarId} pseudo={item.displayName} size="md" />
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{item.displayName}</span>
                <span className={styles.itemHandle}>@{item.handle}</span>
              </div>
            </Link>
            {user && !isMe && item.isFollowedByMe !== null && (
              <button
                type="button"
                className={item.isFollowedByMe ? styles.unfollowBtn : styles.followBtn}
                disabled={pending}
                onClick={() => handleToggleFollow(item)}
                aria-label={
                  item.isFollowedByMe
                    ? t('profile.follow.unfollowAriaLabel', { handle: item.handle })
                    : t('profile.follow.followAriaLabel', { handle: item.handle })
                }
              >
                {item.isFollowedByMe ? (
                  <UserCheck size={16} aria-hidden />
                ) : (
                  <UserPlus size={16} aria-hidden />
                )}
                <span className={styles.btnLabel}>
                  {item.isFollowedByMe ? t('profile.follow.unfollow') : t('profile.follow.follow')}
                </span>
              </button>
            )}
            {isMe && <span className={styles.meBadge}>{t('profile.follow.isMeBadge')}</span>}
          </li>
        );
      })}
    </ul>
  );

  if (isMobile) {
    return (
      <Sheet open title={t('profile.follow.sheetTitle')} onClose={onClose}>
        {tabs}
        {followError && (
          <p className="error" role="alert">
            {followError}
          </p>
        )}
        {list}
      </Sheet>
    );
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-label={t('profile.follow.listTitle')}>
      <div className={styles.header}>
        {tabs}
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X size={20} aria-hidden />
        </button>
      </div>

      {followError && (
        <p className="error" role="alert">
          {followError}
        </p>
      )}

      {list}
    </dialog>
  );
}
