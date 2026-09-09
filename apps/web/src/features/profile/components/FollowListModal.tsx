import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, UserPlus, UserCheck, Users, Search, SearchX } from 'lucide-react';
import { Link } from 'react-router';
import Avatar from '@/shared/components/Avatar';
import EmptyState from '@/shared/components/EmptyState';
import SearchField from '@/shared/components/SearchField';
import Sheet from '@/shared/components/Sheet';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
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
  searchUsers,
  type FollowUserItem,
} from '@/features/profile/api/profileApi';
import { splitOnMatch } from '@/features/profile/lib/highlightMatch';
import styles from './FollowListModal.module.css';
import Modal from '@/shared/components/Modal';

type Tab = 'following' | 'followers' | 'search';

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

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
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const searchEnabled = tab === 'search' && debouncedQuery.length >= MIN_SEARCH_LENGTH;

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

  const searchQuery = useQuery({
    queryKey: queryKeys.profile.userSearch(debouncedQuery),
    queryFn: () => searchUsers(debouncedQuery),
    enabled: searchEnabled,
  });

  const invalidateProfileQueries = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.following(handle) });
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.followers(handle) });
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.public(handle) });
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.userSearches });
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

  const activeQuery = { following: followingQuery, followers: followersQuery, search: searchQuery }[
    tab
  ];
  const items = tab === 'search' && !searchEnabled ? [] : (activeQuery.data?.items ?? []);
  const isPending =
    tab === 'search' ? searchEnabled && searchQuery.isPending : activeQuery.isPending;

  const handleToggleFollow = (item: FollowUserItem) => {
    if (item.isFollowedByMe) {
      unfollowMutation.mutate(item.handle);
    } else {
      followMutation.mutate(item.handle);
    }
  };

  const renderHighlighted = (value: string) =>
    tab === 'search' && debouncedQuery.length >= MIN_SEARCH_LENGTH
      ? splitOnMatch(value, debouncedQuery).map((segment, index) =>
          segment.matched ? (
            <mark key={index} className={styles.highlight}>
              {segment.text}
            </mark>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        )
      : value;

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
      <button
        type="button"
        className={tab === 'search' ? styles.tabActive : styles.tab}
        onClick={() => setTab('search')}
        aria-label={isMobile ? t('profile.follow.search.tabAriaLabel') : undefined}
      >
        {isMobile ? <UserPlus size={16} aria-hidden /> : t('profile.follow.search.tab')}
      </button>
    </div>
  );

  const searchRow = tab === 'search' && (
    <div className={styles.searchRow}>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={t('profile.follow.search.placeholder')}
        ariaLabel={t('profile.follow.search.tabAriaLabel')}
      />
      {query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH && (
        <p className={styles.hint}>
          {t('profile.follow.search.minLength', { count: String(MIN_SEARCH_LENGTH) })}
        </p>
      )}
    </div>
  );

  const emptyState =
    tab === 'search' ? (
      <EmptyState
        compact
        icon={
          debouncedQuery.length >= MIN_SEARCH_LENGTH ? (
            <SearchX size={22} aria-hidden />
          ) : (
            <Search size={22} aria-hidden />
          )
        }
        title={
          debouncedQuery.length >= MIN_SEARCH_LENGTH
            ? t('profile.follow.search.emptyTitle')
            : t('profile.follow.search.idleTitle')
        }
        message={
          debouncedQuery.length >= MIN_SEARCH_LENGTH
            ? t('profile.follow.search.emptyMessage')
            : t('profile.follow.search.idleMessage')
        }
      />
    ) : (
      <EmptyState
        compact
        icon={<Users size={22} aria-hidden />}
        message={t('profile.follow.empty')}
      />
    );

  const list = (
    <ul className={styles.list}>
      {isPending && <li className={styles.placeholder}>{t('common.loading')}</li>}
      {!isPending && items.length === 0 && <li>{emptyState}</li>}
      {items.map((item) => {
        const isMe = user?.handle === item.handle;
        const pending = followMutation.isPending || unfollowMutation.isPending;
        return (
          <li key={item.handle} className={styles.item}>
            <Link to={ROUTES.profile(item.handle)} className={styles.itemLink} onClick={onClose}>
              <Avatar avatarId={item.avatarId} pseudo={item.displayName} size="md" />
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{renderHighlighted(item.displayName)}</span>
                <span className={styles.itemHandle}>@{renderHighlighted(item.handle)}</span>
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

  const searchError =
    tab === 'search' && searchQuery.isError
      ? getErrorMessage(searchQuery.error, t('profile.follow.search.error'))
      : null;

  const errorBanner = (followError ?? searchError) && (
    <p className="error" role="alert">
      {followError ?? searchError}
    </p>
  );

  if (isMobile) {
    return (
      <Sheet open title={t('profile.follow.sheetTitle')} onClose={onClose}>
        {tabs}
        {searchRow}
        {errorBanner}
        {list}
      </Sheet>
    );
  }

  return (
    <Modal open onClose={onClose} size="md" column ariaLabel={t('profile.follow.listTitle')}>
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

      {searchRow}
      {errorBanner}

      {list}
    </Modal>
  );
}
