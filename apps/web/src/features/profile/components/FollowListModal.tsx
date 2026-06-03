import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, UserPlus, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '@/shared/components/Avatar';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
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
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>(initialTab);

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

  const followMutation = useMutation({
    mutationFn: (h: string) => followUser(h),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.following(handle) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.followers(handle) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.public(handle) });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (h: string) => unfollowUser(h),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.following(handle) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.followers(handle) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.public(handle) });
    },
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

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={t('profile.follow.listTitle')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
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
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <ul className={styles.list}>
          {activeQuery.isPending && <li className={styles.placeholder}>{t('common.loading')}</li>}
          {!activeQuery.isPending && items.length === 0 && (
            <li className={styles.placeholder}>{t('profile.follow.empty')}</li>
          )}
          {items.map((item) => {
            const isMe = user?.handle === item.handle;
            const pending = followMutation.isPending || unfollowMutation.isPending;
            return (
              <li key={item.handle} className={styles.item}>
                <Link
                  to={ROUTES.profile(item.handle)}
                  className={styles.itemLink}
                  onClick={onClose}
                >
                  <Avatar avatarId={item.avatarId} size="sm" />
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
                    {item.isFollowedByMe
                      ? t('profile.follow.unfollow')
                      : t('profile.follow.follow')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
