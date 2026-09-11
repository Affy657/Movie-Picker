import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { X } from 'lucide-react';
import Sheet from '@/shared/components/Sheet';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
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
import FollowListEmptyState from './FollowListEmptyState';
import FollowListRow from './FollowListRow';
import FollowListTabs from './FollowListTabs';
import FollowSearchRow, { MIN_SEARCH_LENGTH } from './FollowSearchRow';
import styles from './FollowListModal.module.css';
import Modal from '@/shared/components/Modal';

type Tab = 'following' | 'followers' | 'search';

const SEARCH_DEBOUNCE_MS = 300;

type FollowListQuery = UseQueryResult<{ items: FollowUserItem[] }>;

function highlightTerm(searching: boolean, debouncedQuery: string) {
  return searching && debouncedQuery.length >= MIN_SEARCH_LENGTH ? debouncedQuery : '';
}

function visibleItems(searching: boolean, searchEnabled: boolean, activeQuery: FollowListQuery) {
  if (searching && !searchEnabled) return [];
  return activeQuery.data?.items ?? [];
}

function isListPending(searching: boolean, searchEnabled: boolean, activeQuery: FollowListQuery) {
  if (searching) return searchEnabled && activeQuery.isPending;
  return activeQuery.isPending;
}

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
  const searching = tab === 'search';
  const searchEnabled = searching && debouncedQuery.length >= MIN_SEARCH_LENGTH;

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

  const mutationHandlers = {
    onSuccess: () => {
      setFollowError(null);
      invalidateProfileQueries();
    },
    onError: (err: unknown) => setFollowError(getErrorMessage(err, t('profile.follow.error'))),
  };

  const followMutation = useMutation({
    mutationFn: (h: string) => followUser(h),
    ...mutationHandlers,
  });

  const unfollowMutation = useMutation({
    mutationFn: (h: string) => unfollowUser(h),
    ...mutationHandlers,
  });

  const activeQuery: FollowListQuery = {
    following: followingQuery,
    followers: followersQuery,
    search: searchQuery,
  }[tab];

  const items = visibleItems(searching, searchEnabled, activeQuery);
  const isPending = isListPending(searching, searchEnabled, activeQuery);
  const highlight = highlightTerm(searching, debouncedQuery);
  const togglePending = followMutation.isPending || unfollowMutation.isPending;

  const handleToggleFollow = (item: FollowUserItem) => {
    const mutation = item.isFollowedByMe ? unfollowMutation : followMutation;
    mutation.mutate(item.handle);
  };

  const tabs = (
    <FollowListTabs
      tab={tab}
      followingCount={followingCount}
      followersCount={followersCount}
      onSelect={setTab}
    />
  );

  const searchRow = searching && <FollowSearchRow value={query} onChange={setQuery} />;

  const list = (
    <ul className={styles.list}>
      {isPending && <li className={styles.placeholder}>{t('common.loading')}</li>}
      {!isPending && items.length === 0 && (
        <li>
          <FollowListEmptyState searching={searching} hasSearchTerm={highlight.length > 0} />
        </li>
      )}
      {items.map((item) => (
        <FollowListRow
          key={item.handle}
          item={item}
          isMe={user?.handle === item.handle}
          canFollow={Boolean(user) && user?.handle !== item.handle && item.isFollowedByMe !== null}
          pending={togglePending}
          highlight={highlight}
          onToggleFollow={handleToggleFollow}
          onNavigate={onClose}
        />
      ))}
    </ul>
  );

  const searchError = searchQuery.isError
    ? getErrorMessage(searchQuery.error, t('profile.follow.search.error'))
    : null;

  const bannerMessage = followError ?? (searching ? searchError : null);

  const errorBanner = bannerMessage && (
    <p className="error" role="alert">
      {bannerMessage}
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
